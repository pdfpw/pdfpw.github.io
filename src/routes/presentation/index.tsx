import { createFileRoute, Link } from "@tanstack/react-router";
import { atom, useAtom } from "jotai";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Suspense, startTransition, use, useEffect } from "react";
import * as typia from "typia";
import {
	getPdfData,
	getPresentationPairId,
	useConfig,
	usePresentationBroadcast,
} from "#src/broadcast";
import { ErrorBoundary } from "#src/components/ErrorBoundary.tsx";
import { OverviewDialog } from "#src/components/OverviewDialog";
import { Button } from "#src/components/ui/button.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import { createUseMemoried } from "#src/lib/use-memoried.ts";
import { cn } from "#src/lib/utils.ts";
import { Menu } from "./-Menu";
import { SlideStage } from "./-SlideStage";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PresentationSearch {
	file?: string;
}

export const Route = createFileRoute("/presentation/")({
	component: RouteComponent,
	validateSearch: typia.createValidate<PresentationSearch>(),
});

const pageNumberAtom = atom(1);
const isBlackoutAtom = atom(false);
const isOverviewModeAtom = atom(false);

function RouteComponent() {
	const { file } = Route.useSearch({
		select: ({ file }) => ({ file }),
	});

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
		);

	return (
		<main className="min-h-screen grid bg-blackout">
			<ErrorBoundary
				fallbackRender={(error) => {
					if (error instanceof Error) {
						switch (error.message) {
							case "TIMEOUT_PAIRING_PRESENTATION":
								return (
									<div className="h-full flex items-center justify-center">
										ペアリングに失敗しました。プレゼンター画面を開き直すか、同名のファイルで開いているか確認してください。
									</div>
								);
							case "TIMEOUT_LOADING_PDFPC_CONFIG":
								return (
									<div className="h-full flex items-center justify-center">
										設定を読み込めませんでした。同名のファイルでプレゼンター画面を開いているか確認してください。
									</div>
								);
							case "TIMEOUT_LOADING_PDF_BUFFER":
								return (
									<div className="h-full flex items-center justify-center">
										PDFファイルの読み込みに失敗しました。同名のファイルでプレゼンター画面を開いているか確認してください。
									</div>
								);
							default:
								return (
									<div className="h-full flex items-center justify-center">
										エラーが発生しました: {error.message}
									</div>
								);
						}
					}
					return <div>予期しないエラーが発生しました。</div>;
				}}
			>
				<Suspense fallback={<Skeleton></Skeleton>}>
					<RecentPdfResolver fileName={file} />
				</Suspense>
			</ErrorBoundary>
		</main>
	);
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
	const pdfpc = useConfig(fileName, pairId);
	return (
		<PresentationView
			pdf={pdf}
			pdfpc={pdfpc}
			fileName={fileName}
			pairId={pairId}
		/>
	);
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
	pdf,
	pdfpc,
	fileName,
	pairId,
}: {
	pdf: File | FileSystemFileHandle | undefined;
	pdfpc: ResolvedPdfpcConfigV2;
	fileName: string;
	pairId: string;
}) {
	const pdfBuffer = use(pdf ? getPdfBuffer(pdf) : getPdfData(fileName, pairId));
	const pdfPromise = usePdfPromise(pdfBuffer);
	const pdfProxy = use(pdfPromise);
	const [pageNumber, setPageNumber] = useAtom(pageNumberAtom);
	const [isBlackout, setIsBlackout] = useAtom(isBlackoutAtom);
	const [isOverviewMode, setIsOverviewMode] = useAtom(isOverviewModeAtom);

	usePresentationBroadcast(fileName, pairId, {
		onPageNumberChange: (pageNumber) =>
			startTransition(() => setPageNumber(pageNumber)),
		onBlackoutChange: (nextIsBlackout) =>
			startTransition(() => setIsBlackout(nextIsBlackout)),
	});

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "f") {
				if (document.fullscreenElement) {
					document.exitFullscreen();
				} else {
					document.documentElement.requestFullscreen();
				}
			} else if (e.key === "Tab") {
				e.preventDefault();
				setIsOverviewMode((prev) => !prev);
			} else if (e.key === "Escape" && isOverviewMode) {
				e.preventDefault();
				setIsOverviewMode(false);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOverviewMode]);

	return (
		<div className="relative grid">
			<SlideStage
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpc}
				currentPageNumber={pageNumber}
				isBlackout={isBlackout}
			/>
			<div
				className={cn([
					"absolute bottom-24 w-full flex justify-center",
					{
						"opacity-0 pointer-events-none": isBlackout,
					},
				])}
			>
				<Menu pdfpcConfig={pdfpc} currentPageNumber={pageNumber} />
			</div>
			<OverviewDialog
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpc}
				currentSlide={pageNumber}
				open={isOverviewMode}
				onClose={() => setIsOverviewMode(false)}
				onSlideSelect={(slideNumber) =>
					startTransition(() => setPageNumber(slideNumber))
				}
			/>
		</div>
	);
}
