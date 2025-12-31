import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, startTransition, useId, useReducer, useState } from "react";
import { useLocalStorageSync } from "../../hooks/use-local-storage-sync";
import {
	canUseFSA,
	ensureHandleReadable,
	ensureHandleWritable,
} from "../../lib/fsa";
import {
	clearRecentStore,
	getRecentFiles,
	openDb,
	type RecentDb,
	type RecentFile,
	removeRecent,
	type Settings,
	upsertRecent,
} from "../../lib/recent-store";
import { DropzoneSection } from "./-index/DropzoneSection";
import { HeroSection } from "./-index/HeroSection";
import { RecentSection, RecentSectionLoading } from "./-index/RecentSection";
import { RecentSectionData } from "./-index/RecentSectionData";

export const Route = createFileRoute("/(main)/")({
	component: Home,
});

function Home() {
	const [supportsFSA] = useState(() => canUseFSA());
	const [recentFilesPromise, refreshRecentFiles] = useReducer(
		(_, db: RecentDb) => getRecentFiles(db),
		undefined,
		async () => getRecentFiles(await openDb()),
	);
	const [saveHistory, setSaveHistory] = useLocalStorageSync<boolean>(
		"pdfpw-save-history",
		true,
	);
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
				});
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
			});
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
			});
		} catch (error) {
			console.warn("Failed to clear recent files", error);
		}
	}

	async function handleFiles(files: File[], handles?: FileSystemFileHandle[]) {
		const sameBase = (pdfName: string, configName: string) => {
			const basePdf = pdfName.replace(/\.pdf$/i, "");
			const baseCfg = configName.replace(/\.pdfpc$/i, "");
			return basePdf.toLowerCase() === baseCfg.toLowerCase();
		};

		const pdf = files.find(
			(f) =>
				f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
		);
		const pdfpc = pdf
			? files.find(
					(f) => /\.pdfpc$/i.test(f.name) && sameBase(pdf.name, f.name),
				)
			: undefined;

		if (!pdf) {
			setStatus("PDFファイルを選択してください");
			return;
		}

		const pdfHandle = handles?.find((h) => h.name === pdf.name);
		const pdfpcHandle =
			pdf && pdfpc && sameBase(pdf.name, pdfpc.name)
				? handles?.find((h) => h.name === pdfpc.name)
				: undefined;

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
			});
			const db = await openDb();
			startTransition(() => {
				refreshRecentFiles(db);
			});
		} else if (saveHistory) {
			// Standard Mode: save snapshot
			await saveRecent({
				id: `snapshot-${pdf.name}-${Date.now()}`,
				name: pdf.name,
				file: pdf,
				configFile: pdfpc,
				configName: pdfpc?.name,
				lastOpened: Date.now(),
			});
			const db = await openDb();
			startTransition(() => {
				refreshRecentFiles(db);
			});
		}

		setStatus(
			pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
				? `「${pdf.name}」と設定ファイル「${pdfpc.name}」を読み込み中…`
				: `「${pdf.name}」を読み込み中…`,
		);

		await router.navigate({
			to: "/presenter",
			search: {
				file: pdf.name,
			},
			state: {
				pdf: pdfHandle ?? pdf,
				pdfpc: pdfpcHandle ?? pdfpc,
			},
		});
		window.open(
			router.buildLocation({
				to: "/presentation",
				search: {
					file: pdf.name,
				},
			}).href,
			"_blank",
			"noopener,noreferrer,popup=yes,width=1200,height=675,resizable=yes",
		);
	}

	async function onFilesSelected(files: File[]) {
		await handleFiles(files);
	}

	async function onRecentClick(item: RecentFile) {
		if (item.handle) {
			const canRead = await ensureHandleReadable(item.handle);
			if (!canRead) {
				setStatus("権限が拒否されました。再度許可してください。");
				return;
			}
			if (item.configHandle) {
				const baseMatch =
					item.configName && item.name
						? item.name.replace(/\.pdf$/i, "").toLowerCase() ===
							item.configName.replace(/\.pdfpc$/i, "").toLowerCase()
						: false;
				if (!baseMatch) {
					setStatus(
						"設定ファイル名がPDFと一致しません（example.pdf ↔ example.pdfpc）。",
					);
					return;
				}
				const ok = await ensureHandleWritable(item.configHandle);
				if (!ok) {
					setStatus("設定ファイルの権限が拒否されました。");
					return;
				}
			}
			const file = await item.handle.getFile();
			const extraFiles = item.configHandle
				? [await item.configHandle.getFile()]
				: [];
			await handleFiles(
				[file, ...extraFiles],
				[item.handle, ...(item.configHandle ? [item.configHandle] : [])],
			);
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
					setStatus("設定ファイルの権限が拒否されました。");
					return;
				}
				continue;
			}
			readableHandles.push(handle);
			files.push(await handle.getFile());
		}
		if (files.length === 0) {
			setStatus("ファイルへの権限がありません。");
			return;
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
			setStatus(
				"pdfpc は PDF と同じ名前にしてください（例: example.pdf ↔ example.pdfpc）",
			);
			return;
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
			});
			const handles = picker ?? [];
			if (handles.length === 0) return;
			await handlePickedHandles(handles);
		} catch (error) {
			if ((error as DOMException).name !== "AbortError") {
				setStatus("ファイルを開けませんでした");
			}
		}
	}

	return (
		<main className="bg-linear-to-br from-background via-background to-secondary/20 text-foreground">
			<div className="container mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 pt-12 pb-16">
				<div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
					<div className="flex w-full justify-center lg:justify-start">
						<HeroSection status={status} />
					</div>
					<div className="flex w-full justify-center lg:justify-end">
						<DropzoneSection
							inputId={inputId}
							supportsFSA={supportsFSA}
							onOpenPicker={onOpenPicker}
							onFilesSelected={onFilesSelected}
						/>
					</div>
				</div>
			</div>

			<div className="border-t border-border/50 bg-secondary/5 pt-16">
				{supportsFSA ? (
					<Suspense fallback={<RecentSectionLoading />}>
						<RecentSectionData
							recentFilesPromise={recentFilesPromise}
							settings={{ saveHistory }}
							onToggleHistory={toggleHistory}
							onClearRecent={clearRecent}
							onRecentClick={onRecentClick}
							onDeleteRecent={deleteRecent}
						/>
					</Suspense>
				) : (
					<RecentSection
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
		</main>
	);
}
