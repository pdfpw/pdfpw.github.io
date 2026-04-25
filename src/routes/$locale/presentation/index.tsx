import { createFileRoute, Link } from "@tanstack/react-router";
import { atom, useAtom } from "jotai";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
	Suspense,
	startTransition,
	use,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react";
import * as typia from "typia";
import {
	getPresentationPairId,
	usePresentationBroadcast,
	useToolBroadcast,
} from "#src/broadcast";
import { ErrorBoundary } from "#src/components/ErrorBoundary.tsx";
import { KeybindingHelpDialog } from "#src/components/KeybindingHelpDialog";
import { OverviewDialog } from "#src/components/OverviewDialog";
import { PointerOverlay } from "#src/components/PointerOverlay.tsx";
import { Button } from "#src/components/ui/button.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import { useKeybindingHelp } from "#src/hooks/use-keybinding-help";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import { createUseMemoried } from "#src/lib/use-memoried.ts";
import { cn } from "#src/lib/utils.ts";
import { usePointerEmitter } from "#src/routes/-hooks/use-pointer-emitter";
import { useToolShortcut } from "#src/routes/-hooks/use-tool-shortcut";
import { usePresentationShortcut } from "./-hooks/use-presentation-shortcut";
import { usePresentationViewShortcut } from "./-hooks/use-presentation-view-shortcut";
import { Menu } from "./-Menu";
import { SlideStage } from "./-SlideStage";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PresentationSearch {
	file?: string;
}

export const Route = createFileRoute("/$locale/presentation/")({
	component: RouteComponent,
	validateSearch: typia.createValidate<PresentationSearch>(),
});

const pageNumberAtom = atom(1);
const isBlackoutAtom = atom(false);
const isOverviewModeAtom = atom(false);

function RouteComponent() {
	const { file } = Route.useSearch({
		select: ({ file }) => ({ file }),
	})

	if (!file)
		return (
			<main className="min-h-screen bg-background text-foreground">
				<div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
					<h1 className="text-xl font-semibold">
						ファイルが指定されていません
					</h1>
					<p className="text-muted-foreground">
						ホームに戻って再度ファイルを選択してください。
					</p>
					<Button asChild className="w-fit">
						<Link to="/">ホームへ戻る</Link>
					</Button>
				</div>
			</main>
		)

	return (
		<main className="min-h-screen grid bg-blackout">
			<ErrorBoundary
				fallbackRender={(error, reset) => {
					if (error instanceof Error) {
						switch (error.message) {
							case "TIMEOUT_PAIRING_PRESENTATION":
								return (
									<div className="h-full flex items-center justify-center">
										ペアリングに失敗しました。プレゼンター画面を開き直すか、同名のファイルで開いているか確認してください。
									</div>
								)
							case "TIMEOUT_LOADING_PDFPC_CONFIG":
								return (
									<div className="h-full flex items-center justify-center">
										設定を読み込めませんでした。同名のファイルでプレゼンター画面を開いているか確認してください。
									</div>
								)
							case "TIMEOUT_LOADING_PDF_BUFFER":
								return (
									<div className="h-full flex items-center justify-center">
										PDFファイルの読み込みに失敗しました。同名のファイルでプレゼンター画面を開いているか確認してください。
									</div>
								)
							default:
								return (
									<div className="h-full flex flex-col items-center justify-center gap-4 p-6">
										<div className="text-center">
											<div className="text-red-500 font-semibold mb-2">
												エラーが発生しました
											</div>
											<div className="text-muted-foreground">
												{error.message}
											</div>
										</div>
										<button
											type="button"
											onClick={reset}
											className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
										>
											リロードして再試行
										</button>
									</div>
								)
						}
					}
					return (
						<div className="h-full flex flex-col items-center justify-center gap-4 p-6">
							<div className="text-center">
								<div className="text-red-500 font-semibold mb-2">
									予期しないエラーが発生しました
								</div>
							</div>
							<button
								type="button"
								onClick={reset}
								className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
							>
								リロードして再試行
							</button>
						</div>
					)
				}}
			>
				<Suspense fallback={<Skeleton></Skeleton>}>
					<RecentPdfResolver fileName={file} />
				</Suspense>
			</ErrorBoundary>
		</main>
	)
}

const useGetRecentFileById = createUseMemoried(async (fileName: string) =>
	getRecentFileById(await openDb(), fileName),
);
const usePairId = createUseMemoried((fileName: string) =>
	getPresentationPairId(fileName),
);

function RecentPdfResolver({ fileName }: { fileName: string }) {
	const recentFilePromise = useGetRecentFileById(fileName);
	const recentFile = use(recentFilePromise);
	const pdf = recentFile?.handle;
	const pairId = use(usePairId(fileName));
	return (
		<PresentationBroadcastData fileName={fileName} pairId={pairId} pdf={pdf} />
	)
}

interface PresentationBroadcastDataProps {
	fileName: string;
	pairId: string;
	pdf?: File | FileSystemFileHandle;
}

function PresentationBroadcastData({
	fileName,
	pairId,
	pdf,
}: PresentationBroadcastDataProps) {
	const [, startTransition] = useTransition();
	const [initData, setInitData] = useState<{
		pdfpcConfig: ResolvedPdfpcConfigV2;
		pdfData: ArrayBuffer;
		pageNumber: number;
		isBlackout: boolean;
	} | null>(null);

	usePresentationBroadcast(fileName, pairId, {
		onPageNumberChange: (pageNumber) => {
			startTransition(() => {
				setInitData((prev) => (prev ? { ...prev, pageNumber } : null));
			})
		},
		onBlackoutChange: (isBlackout) => {
			startTransition(() => {
				setInitData((prev) => (prev ? { ...prev, isBlackout } : null));
			})
		},
		onInitialize: (data) => {
			console.log("[PresentationBroadcastData] Received initialize data");
			startTransition(() => {
				setInitData({
					pdfpcConfig: data.pdfpcConfig,
					pdfData: data.pdfData,
					pageNumber: data.pageNumber,
					isBlackout: data.isBlackout,
				})
			})
		},
	})

	if (!initData) {
		// Show loading state while waiting for initialization
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center">
					<div className="text-lg mb-2">接続中...</div>
					<div className="text-sm text-muted-foreground">
						プレゼンター画面を開いているか確認してください
					</div>
				</div>
			</div>
		)
	}

	return (
		<PresentationView
			{...initData}
			localPdf={pdf}
			fileName={fileName}
			pairId={pairId}
		/>
	)
}

const getPdfBuffer = createUseMemoried(
	async (file: File | FileSystemFileHandle) => {
		if (!(file instanceof File)) file = await file.getFile();
		return await file.arrayBuffer();
	},
);
const usePdfPromise = createUseMemoried(
	(buffer: ArrayBuffer) => getDocument(buffer).promise,
);

function PresentationView({
	pdfpcConfig,
	pdfData,
	pageNumber,
	isBlackout,
	localPdf,
	fileName,
	pairId,
}: {
	pdfpcConfig: ResolvedPdfpcConfigV2;
	pdfData: ArrayBuffer;
	pageNumber: number;
	isBlackout: boolean;
	localPdf?: File | FileSystemFileHandle;
	fileName: string;
	pairId: string;
}) {
	const pdfBuffer = use(
		localPdf ? getPdfBuffer(localPdf) : Promise.resolve(pdfData),
	)
	const pdfPromise = usePdfPromise(pdfBuffer);
	const pdfProxy = use(pdfPromise);
	const [currentPageNumber, setCurrentPageNumber] = useAtom(pageNumberAtom);
	const [currentIsBlackout, setCurrentIsBlackout] = useAtom(isBlackoutAtom);
	const [isOverviewMode, setIsOverviewMode] = useAtom(isOverviewModeAtom);

	// Update atoms when props change
	useEffect(() => {
		setCurrentPageNumber(pageNumber);
	}, [pageNumber, setCurrentPageNumber]);
	useEffect(() => {
		setCurrentIsBlackout(isBlackout);
	}, [isBlackout, setCurrentIsBlackout]);

	console.log("[PresentationView] Render with:", {
		currentPageNumber,
		currentIsBlackout,
		pdfProxy: !!pdfProxy,
		pdfpcPages: pdfpcConfig.pages.length,
	})

	usePresentationShortcut(fileName, pairId);
	const help = useKeybindingHelp("presentation");

	const stageRef = useRef<HTMLDivElement | null>(null);
	const pdfAreaRef = useRef<HTMLDivElement | null>(null);

	useToolBroadcast(fileName, pairId, "presentation");
	useToolShortcut(fileName, pairId, "presentation");
	usePointerEmitter(pdfAreaRef, fileName, pairId, "presentation");

	usePresentationViewShortcut({
		toggleFullscreen: () => {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				document.documentElement.requestFullscreen();
			}
		},
		toggleOverview: () => setIsOverviewMode((prev) => !prev),
		closeOverviewIfOpen: () => {
			if (isOverviewMode) {
				setIsOverviewMode(false);
				return true
			}
			return false;
		},
	})

	return (
		<div className="relative grid">
			<SlideStage
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpcConfig}
				currentPageNumber={currentPageNumber}
				isBlackout={currentIsBlackout}
				stageRef={stageRef}
				pdfAreaRef={pdfAreaRef}
			/>
			<PointerOverlay containerRef={pdfAreaRef} />
			<div
				className={cn([
					"absolute bottom-24 w-full flex justify-center pointer-events-none",
					{
						"opacity-0": currentIsBlackout,
					},
				])}
			>
				<Menu
					pdfpcConfig={pdfpcConfig}
					currentPageNumber={currentPageNumber}
					onHelpClick={help.open}
				/>
			</div>
			<OverviewDialog
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpcConfig}
				currentSlide={currentPageNumber}
				open={isOverviewMode}
				onClose={() => setIsOverviewMode(false)}
				onSlideSelect={(slideNumber) =>
					startTransition(() => setCurrentPageNumber(slideNumber))
				}
			/>
			<KeybindingHelpDialog
				open={help.isOpen}
				onOpenChange={(o) => (o ? help.open() : help.close())}
			/>
		</div>
	)
}
