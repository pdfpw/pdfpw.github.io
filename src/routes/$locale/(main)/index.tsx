import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, startTransition, useId, useReducer, useState } from "react";
import { useLocalStorageSync } from "#src/hooks/use-local-storage-sync";
import * as m from "#src/paraglide/messages.js";
import {
	canUseFSA,
	ensureHandleReadable,
	ensureHandleWritable,
} from "#src/lib/fsa";
import {
	clearRecentStore,
	getRecentFiles,
	openDb,
	type RecentDb,
	type RecentFile,
	removeRecent,
	upsertRecent,
} from "#src/lib/recent-store";
import { generateThumbnail } from "#src/lib/thumbnail";
import { HeroSection } from "./-index/HeroSection";
import { HowItWorksSection } from "./-index/HowItWorksSection";
import { LibrarySection, LibrarySectionLoading } from "./-index/LibrarySection";
import { LibrarySectionData } from "./-index/LibrarySectionData";

let presentationWindow: Window | null = null;

export const Route = createFileRoute("/$locale/(main)/")({
	component: Home,
});

function Home() {
	const { locale } = Route.useParams();
	const [supportsFSA] = useState(() => canUseFSA());
	const [recentFilesPromise, refreshRecentFiles] = useReducer(
		(_, db: RecentDb) => getRecentFiles(db),
		undefined,
		async () => getRecentFiles(await openDb()),
	)
	const [saveHistory, setSaveHistory] = useLocalStorageSync<boolean>(
		"pdfpw-save-history",
		true,
	)
	const [status, setStatus] = useState<string | null>(null);
	const inputId = useId();
	const router = useRouter();

	async function toggleHistory(value: boolean) {
		setSaveHistory(value);
		if (!value) {
			try {
				const db = await openDb();
				await clearRecentStore(db);
				startTransition(() => {
					refreshRecentFiles(db);
				})
			} catch (error) {
				console.warn("Failed to clear history", error);
			}
		}
	}

	async function saveRecent(entry: RecentFile) {
		if (!saveHistory) return;
		try {
			const db = await openDb();
			await upsertRecent(db, entry);
		} catch (error) {
			console.warn("Failed to save recent file", error);
		}
	}

	async function deleteRecent(id: string) {
		try {
			const db = await openDb();
			await removeRecent(db, id);
			startTransition(() => {
				refreshRecentFiles(db);
			})
		} catch (error) {
			console.warn("Failed to delete recent file", error);
		}
	}

	async function clearRecent() {
		try {
			const db = await openDb();
			await clearRecentStore(db);
			startTransition(() => {
				refreshRecentFiles(db);
			})
		} catch (error) {
			console.warn("Failed to clear recent files", error);
		}
	}

	async function handleFiles(files: File[], handles?: FileSystemFileHandle[]) {
		const sameBase = (pdfName: string, configName: string) => {
			const basePdf = pdfName.replace(/\.pdf$/i, "");
			const baseCfg = configName.replace(/\.pdfpc$/i, "");
			return basePdf.toLowerCase() === baseCfg.toLowerCase();
		}

		const pdf = files.find(
			(f) =>
				f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
		)
		const pdfpc = pdf
			? files.find(
					(f) => /\.pdfpc$/i.test(f.name) && sameBase(pdf.name, f.name),
				)
			: undefined;

		if (!pdf) {
			setStatus(m.presenter_error_no_pdf());
			return
		}

		const thumbnail = await generateThumbnail(pdf);

		const pdfHandle = handles?.find((h) => h.name === pdf.name);
		const pdfpcHandle =
			pdf && pdfpc && sameBase(pdf.name, pdfpc.name)
				? handles?.find((h) => h.name === pdfpc.name)
				: undefined

		if (pdfHandle && supportsFSA) {
			await saveRecent({
				id: pdfHandle.name,
				name: pdf.name,
				handle: pdfHandle,
				configHandle: pdfpcHandle && pdfpc ? pdfpcHandle : undefined,
				configName:
					pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
						? pdfpc.name
						: undefined,
				lastOpened: Date.now(),
				thumbnail: thumbnail ?? undefined,
			})
			const db = await openDb();
			startTransition(() => {
				refreshRecentFiles(db);
			})
		} else if (saveHistory) {
			// Standard Mode: save snapshot
			await saveRecent({
				id: `snapshot-${pdf.name}-${Date.now()}`,
				name: pdf.name,
				file: pdf,
				configFile: pdfpc,
				configName: pdfpc?.name,
				lastOpened: Date.now(),
				thumbnail: thumbnail ?? undefined,
			})
			const db = await openDb();
			startTransition(() => {
				refreshRecentFiles(db);
			})
		}

		setStatus(
			pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
				? m.presenter_status_loading_with_config({ file: pdf.name, config: pdfpc.name })
				: m.presenter_status_loading({ file: pdf.name }),
		)

		await router.navigate({
			to: "/$locale/presenter",
			params: { locale },
			search: {
				file: pdf.name,
			},
			state: {
				pdf: pdfHandle ?? pdf,
				pdfpc: pdfpcHandle ?? pdfpc,
			},
		})
		const url = router.buildLocation({
			to: "/$locale/presentation",
			params: { locale },
			search: {
				file: pdf.name,
			},
		}).href;

		if (presentationWindow && !presentationWindow.closed) {
			presentationWindow.location.href = url;
			presentationWindow.focus();
		} else {
			presentationWindow = window.open(
				url,
				"_blank",
				"width=1200,height=675,resizable=yes",
			)
		}
	}

	async function onFilesSelected(files: File[]) {
		await handleFiles(files);
	}

	async function onRecentClick(item: RecentFile) {
		if (item.handle) {
			const canRead = await ensureHandleReadable(item.handle);
			if (!canRead) {
				setStatus(m.presenter_error_permission_denied());
				return
			}
			if (item.configHandle) {
				const baseMatch =
					item.configName && item.name
						? item.name.replace(/\.pdf$/i, "").toLowerCase() ===
							item.configName.replace(/\.pdfpc$/i, "").toLowerCase()
						: false
				if (!baseMatch) {
					setStatus(m.presenter_error_config_name_mismatch())
					return
				}
				const ok = await ensureHandleWritable(item.configHandle);
				if (!ok) {
					setStatus(m.presenter_error_config_permission());
					return
				}
			}
			const file = await item.handle.getFile();
			const extraFiles = item.configHandle
				? [await item.configHandle.getFile()]
				: []
			await handleFiles(
				[file, ...extraFiles],
				[item.handle, ...(item.configHandle ? [item.configHandle] : [])],
			)
		} else if (item.file) {
			// Restore from snapshot
			const pdf = item.file;
			const pdfpc = item.configFile;
			await handleFiles([pdf, ...(pdfpc ? [pdfpc] : [])]);
		}
	}

	async function handlePickedHandles(handles: FileSystemFileHandle[]) {
		const readableHandles: FileSystemFileHandle[] = [];
		const files: File[] = [];
		for (const handle of handles) {
			const needsWrite = /\.pdfpc$/i.test(handle.name);
			const ok = needsWrite
				? await ensureHandleWritable(handle)
				: await ensureHandleReadable(handle);
			if (!ok) {
				if (needsWrite) {
					setStatus(m.presenter_error_config_permission());
					return
				}
				continue
			}
			readableHandles.push(handle);
			files.push(await handle.getFile());
		}
		if (files.length === 0) {
			setStatus(m.presenter_error_no_file_permission());
			return
		}

		// Validate pdfpc pairing before proceeding
		const pdf = files.find((f) => /\.pdf$/i.test(f.name));
		const pdfpc = files.find((f) => /\.pdfpc$/i.test(f.name));
		if (
			pdfpc &&
			pdf &&
			pdf.name.replace(/\.pdf$/i, "").toLowerCase() !==
				pdfpc.name.replace(/\.pdfpc$/i, "").toLowerCase()
		) {
			setStatus(m.presenter_error_pdfpc_pairing())
			return
		}

		await handleFiles(files, readableHandles);
	}

	async function onOpenPicker() {
		if (!supportsFSA || !("showOpenFilePicker" in window)) return;
		try {
			// showOpenFilePicker is still experimental in TS DOM types
			const picker = await window.showOpenFilePicker?.({
				types: [
					{
						description: "PDF / pdfpc",
						accept: {
							"application/pdf": [".pdf"],
							"application/json": [".pdfpc"],
						},
					},
				],
				excludeAcceptAllOption: true,
				multiple: true,
			})
			const handles = picker ?? [];
			if (handles.length === 0) return;
			await handlePickedHandles(handles);
		} catch (error) {
			if ((error as DOMException).name !== "AbortError") {
				setStatus(m.presenter_error_open_failed());
			}
		}
	}

	return (
		<main key={locale} className="bg-bg text-fg">
			<div className="container mx-auto max-w-6xl px-6 pt-12 pb-14">
				<HeroSection
					status={status}
					inputId={inputId}
					supportsFSA={supportsFSA}
					onOpenPicker={onOpenPicker}
					onFilesSelected={onFilesSelected}
				/>
			</div>

			<div className="border-t border-border">
				{supportsFSA ? (
					<Suspense fallback={<LibrarySectionLoading />}>
						<LibrarySectionData
							recentFilesPromise={recentFilesPromise}
							settings={{ saveHistory }}
							onToggleHistory={toggleHistory}
							onClearRecent={clearRecent}
							onRecentClick={onRecentClick}
							onDeleteRecent={deleteRecent}
						/>
					</Suspense>
				) : (
					<LibrarySection
						supportsFSA={false}
						recentFiles={[]}
						settings={{ saveHistory }}
						onToggleHistory={toggleHistory}
						onClearRecent={() => {}}
						onRecentClick={async () => {}}
						onDeleteRecent={async () => {}}
					/>
				)}
			</div>

			<HowItWorksSection />
		</main>
	)
}
