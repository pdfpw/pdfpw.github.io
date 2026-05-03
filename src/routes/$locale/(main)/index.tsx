import { createFileRoute, useRouter } from "@tanstack/react-router";
import type React from "react";
import {
	Suspense,
	startTransition,
	useEffect,
	useId,
	useReducer,
	useRef,
	useState,
} from "react";
import * as typia from "typia";
import { TypstDiagnosticList } from "#src/components/TypstDiagnosticList";
import { useLocalStorageSync } from "#src/hooks/use-local-storage-sync";
import { FetchPdfError, fetchPdfFromUrl } from "#src/lib/fetch-pdf";
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
import { compileTypst } from "#src/lib/typst";
import {
	containsTypst,
	filesToTypstMeta,
	filesToTypstSources,
	pickMainTypst,
} from "#src/lib/typst-source-detect";
import * as m from "#src/paraglide/messages.js";
import { HeroSection } from "./-index/HeroSection";
import { HowItWorksSection } from "./-index/HowItWorksSection";
import { LibrarySection, LibrarySectionLoading } from "./-index/LibrarySection";
import { LibrarySectionData } from "./-index/LibrarySectionData";

let presentationWindow: Window | null = null;

export interface HomeSearch {
	pdf?: string;
	pdfpc?: string;
}

export const Route = createFileRoute("/$locale/(main)/")({
	component: Home,
	validateSearch: typia.createValidate<HomeSearch>(),
});

function Home() {
	const { locale } = Route.useParams();
	const { pdf: pdfUrlParam, pdfpc: pdfpcUrlParam } = Route.useSearch();
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
	const [status, setStatus] = useState<React.ReactNode | null>(null);
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

	async function proceedWithPdf(
		pdf: File,
		pdfpc: File | undefined,
		handles?: FileSystemFileHandle[],
		typstMeta?: {
			mainPath: string;
			sourceFile?: File;
			assetFiles?: File[];
			sourceHandle?: FileSystemFileHandle;
			assetHandles?: FileSystemFileHandle[];
		},
	) {
		const sameBase = (pdfName: string, configName: string) => {
			const basePdf = pdfName.replace(/\.pdf$/i, "");
			const baseCfg = configName.replace(/\.pdfpc$/i, "");
			return basePdf.toLowerCase() === baseCfg.toLowerCase();
		};

		const thumbnail = await generateThumbnail(pdf);
		const pdfHandle = handles?.find((h) => h.name === pdf.name);
		const pdfpcHandle =
			pdf && pdfpc && sameBase(pdf.name, pdfpc.name)
				? handles?.find((h) => h.name === pdfpc.name)
				: undefined;

		if (typstMeta) {
			const typstId =
				typstMeta.sourceHandle?.name ??
				`snapshot-typst-${typstMeta.sourceFile?.name ?? pdf.name}-${Date.now()}`;
			if (typstMeta.sourceHandle && supportsFSA) {
				await saveRecent({
					kind: "typst",
					id: typstId,
					name: typstMeta.sourceHandle.name,
					mainPath: typstMeta.mainPath,
					handle: typstMeta.sourceHandle,
					assetHandles: typstMeta.assetHandles,
					configHandle: pdfpcHandle && pdfpc ? pdfpcHandle : undefined,
					configName:
						pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
							? pdfpc.name
							: undefined,
					lastOpened: Date.now(),
					thumbnail: thumbnail ?? undefined,
				});
				const db = await openDb();
				startTransition(() => {
					refreshRecentFiles(db);
				});
			} else if (saveHistory) {
				await saveRecent({
					kind: "typst",
					id: typstId,
					name: typstMeta.sourceFile?.name ?? pdf.name,
					mainPath: typstMeta.mainPath,
					file: typstMeta.sourceFile,
					assetFiles: typstMeta.assetFiles,
					configFile: pdfpc,
					configName: pdfpc?.name,
					lastOpened: Date.now(),
					thumbnail: thumbnail ?? undefined,
				});
				const db = await openDb();
				startTransition(() => {
					refreshRecentFiles(db);
				});
			}
		} else if (pdfHandle && supportsFSA) {
			await saveRecent({
				kind: "pdf",
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
			});
			const db = await openDb();
			startTransition(() => {
				refreshRecentFiles(db);
			});
		} else if (saveHistory) {
			await saveRecent({
				kind: "pdf",
				id: `snapshot-${pdf.name}-${Date.now()}`,
				name: pdf.name,
				file: pdf,
				configFile: pdfpc,
				configName: pdfpc?.name,
				lastOpened: Date.now(),
				thumbnail: thumbnail ?? undefined,
			});
			const db = await openDb();
			startTransition(() => {
				refreshRecentFiles(db);
			});
		}

		setStatus(
			pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
				? m.presenter_status_loading_with_config({
						file: pdf.name,
						config: pdfpc.name,
					})
				: m.presenter_status_loading({ file: pdf.name }),
		);

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
		});
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
			);
		}
	}

	async function handleFiles(files: File[], handles?: FileSystemFileHandle[]) {
		const sameBase = (pdfName: string, configName: string) => {
			const basePdf = pdfName.replace(/\.pdf$/i, "");
			const baseCfg = configName.replace(/\.pdfpc$/i, "");
			return basePdf.toLowerCase() === baseCfg.toLowerCase();
		};

		// Typst branch — detect by filename only first; do not eagerly read bytes.
		// `filesToTypstSources` is async (arrayBuffer) and must NOT run on the PDF
		// path or we double-load every PDF deck on open.
		const meta = filesToTypstMeta(files);
		if (containsTypst(meta)) {
			const mainPath = pickMainTypst(meta);
			if (!mainPath) {
				setStatus(m.typst_error_no_main());
				return;
			}
			setStatus(m.typst_status_loading_wasm());
			const sources = await filesToTypstSources(files);
			let result: Awaited<ReturnType<typeof compileTypst>>;
			try {
				result = await compileTypst(
					{ sources, mainPath },
					{
						onProgress: (p) => {
							if (p.stage === "loading-wasm")
								setStatus(m.typst_status_loading_wasm());
							else if (p.stage === "fetching-packages")
								setStatus(
									m.typst_status_fetching_packages({
										package: p.current ?? "",
									}),
								);
							else if (p.stage === "compiling")
								setStatus(m.typst_status_compiling());
						},
					},
				);
			} catch (err) {
				if ((err as Error)?.name === "AbortError") {
					setStatus(null);
					return;
				}
				setStatus(m.typst_error_runtime_init());
				return;
			}
			if (!result.ok) {
				setStatus(<TypstDiagnosticList items={result.diagnostics} />);
				return;
			}
			const stem =
				mainPath
					.replace(/\.typ$/i, "")
					.split("/")
					.pop() ?? "main";
			// Pass the underlying buffer directly to avoid an extra Uint8Array copy.
			// Worker-cloned Uint8Array always lands with a plain ArrayBuffer
			// (byteOffset 0, full length), so the cast is safe.
			const compiledPdf = new File(
				[result.pdf.buffer as ArrayBuffer],
				`${stem}.pdf`,
				{
					type: "application/pdf",
				},
			);
			const pdfpc = files.find(
				(f) => /\.pdfpc$/i.test(f.name) && sameBase(`${stem}.pdf`, f.name),
			);

			const mainSourceFile = files.find(
				(f) =>
					((f as File & { webkitRelativePath?: string }).webkitRelativePath ||
						f.name) === mainPath,
			);
			const assetFiles = files.filter(
				(f) => f !== mainSourceFile && !/\.pdfpc$/i.test(f.name),
			);
			const assetHandles = handles?.filter(
				(h) => h.name !== mainSourceFile?.name && !/\.pdfpc$/i.test(h.name),
			);
			const sourceHandle = handles?.find(
				(h) => h.name === (mainSourceFile?.name ?? mainPath.split("/").pop()),
			);

			// Forward `handles` so `proceedWithPdf` can resolve the pdfpc handle
			// for FSA-based Typst recents (the synthetic compiled PDF itself has
			// no handle, so the pdfHandle search is a harmless miss).
			await proceedWithPdf(compiledPdf, pdfpc, handles, {
				mainPath,
				sourceFile: mainSourceFile,
				assetFiles,
				sourceHandle,
				assetHandles,
			});
			return;
		}

		// PDF branch (existing behavior)
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
			setStatus(m.presenter_error_no_pdf());
			return;
		}
		await proceedWithPdf(pdf, pdfpc, handles);
	}

	async function onFilesSelected(files: File[]) {
		await handleFiles(files);
	}

	async function onRecentClick(item: RecentFile) {
		if (item.kind === "typst") {
			if (item.handle) {
				const canRead = await ensureHandleReadable(item.handle);
				if (!canRead) {
					setStatus(m.presenter_error_permission_denied());
					return;
				}
				const main = await item.handle.getFile();
				const assets: File[] = [];
				for (const ah of item.assetHandles ?? []) {
					const ok = await ensureHandleReadable(ah);
					if (ok) assets.push(await ah.getFile());
				}
				const cfg = item.configHandle
					? [await item.configHandle.getFile()]
					: [];
				const allHandles = [item.handle, ...(item.assetHandles ?? [])];
				if (item.configHandle) allHandles.push(item.configHandle);
				await handleFiles([main, ...assets, ...cfg], allHandles);
				return;
			}
			if (item.file) {
				const cfg = item.configFile ? [item.configFile] : [];
				await handleFiles([item.file, ...(item.assetFiles ?? []), ...cfg]);
				return;
			}
			return;
		}

		if (item.handle) {
			const canRead = await ensureHandleReadable(item.handle);
			if (!canRead) {
				setStatus(m.presenter_error_permission_denied());
				return;
			}
			if (item.configHandle) {
				const baseMatch =
					item.configName && item.name
						? item.name.replace(/\.pdf$/i, "").toLowerCase() ===
							item.configName.replace(/\.pdfpc$/i, "").toLowerCase()
						: false;
				if (!baseMatch) {
					setStatus(m.presenter_error_config_name_mismatch());
					return;
				}
				const ok = await ensureHandleWritable(item.configHandle);
				if (!ok) {
					setStatus(m.presenter_error_config_permission());
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
					setStatus(m.presenter_error_config_permission());
					return;
				}
				continue;
			}
			readableHandles.push(handle);
			files.push(await handle.getFile());
		}
		if (files.length === 0) {
			setStatus(m.presenter_error_no_file_permission());
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
			setStatus(m.presenter_error_pdfpc_pairing());
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
				setStatus(m.presenter_error_open_failed());
			}
		}
	}

	async function onUrlSubmit(rawUrl: string, rawPdfpcUrl?: string) {
		const trimmed = rawUrl.trim();
		if (!trimmed) return;
		const trimmedPdfpc = rawPdfpcUrl?.trim() || undefined;
		setStatus(m.presenter_status_fetching_url({ url: trimmed }));
		try {
			const fetched = await fetchPdfFromUrl(trimmed, {
				pdfpcUrl: trimmedPdfpc,
			});
			const files = fetched.pdfpc
				? [fetched.pdf, fetched.pdfpc]
				: [fetched.pdf];
			await handleFiles(files);
		} catch (error) {
			if (error instanceof FetchPdfError) {
				switch (error.kind) {
					case "invalid-url":
						setStatus(m.presenter_error_url_invalid());
						break;
					case "cors-or-network":
						setStatus(m.presenter_error_url_cors());
						break;
					case "http-error":
						setStatus(
							m.presenter_error_url_http({
								status: String(error.status ?? "?"),
							}),
						);
						break;
					case "not-pdf":
						setStatus(m.presenter_error_url_not_pdf());
						break;
					case "aborted":
						setStatus(null);
						break;
				}
			} else {
				setStatus(m.presenter_error_url_failed());
			}
		}
	}

	const autoOpenedUrlRef = useRef<string | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: onUrlSubmit recreated each render; ref-guard dedupes
	useEffect(() => {
		if (!pdfUrlParam) return;
		const key = `${pdfUrlParam} ${pdfpcUrlParam ?? ""}`;
		if (autoOpenedUrlRef.current === key) return;
		autoOpenedUrlRef.current = key;
		void onUrlSubmit(pdfUrlParam, pdfpcUrlParam);
	}, [pdfUrlParam, pdfpcUrlParam]);

	return (
		<main key={locale} className="bg-bg text-fg">
			<div className="container mx-auto max-w-6xl px-6 pt-12 pb-14">
				<HeroSection
					status={status}
					inputId={inputId}
					supportsFSA={supportsFSA}
					locale={locale}
					onOpenPicker={onOpenPicker}
					onFilesSelected={onFilesSelected}
					onUrlSubmit={onUrlSubmit}
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
	);
}
