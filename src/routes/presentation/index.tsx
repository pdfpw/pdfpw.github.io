import { createFileRoute, Link } from "@tanstack/react-router";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Suspense, startTransition, use, useEffect, useState } from "react";
import * as typia from "typia";
import { ErrorBoundary } from "#src/components/ErrorBoundary.tsx";
import { Button } from "#src/components/ui/button.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import { createUseMemoried } from "#src/lib/use-memoried.ts";
import { getPdfData, useConfig, usePresentationBroadcast } from "../-broadcast";
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
		<main className="min-h-screen grid bg-black">
			<ErrorBoundary
				fallbackRender={(error) => {
					if (error instanceof Error) {
						switch (error.message) {
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
function RecentPdfResolver({ fileName }: { fileName: string }) {
	const recentFilePromise = useGetRecentFileById(fileName);
	const recentFile = use(recentFilePromise);
	const pdf = recentFile?.handle;
	const pdfpc = useConfig(fileName);
	return <PresentationView pdf={pdf} pdfpc={pdfpc} fileName={fileName} />;
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
}: {
	pdf: File | FileSystemFileHandle | undefined;
	pdfpc: ResolvedPdfpcConfigV2;
	fileName: string;
}) {
	const pdfBuffer = use(pdf ? getPdfBuffer(pdf) : getPdfData(fileName));
	const pdfPromise = usePdfPromise(pdfBuffer);
	const pdfProxy = use(pdfPromise);
	const [pageNumber, setPageNumber] = useState(1);

	usePresentationBroadcast(fileName, (pageNumber) =>
		startTransition(() => setPageNumber(pageNumber)),
	);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "f") {
				if (document.fullscreenElement) {
					document.exitFullscreen();
				} else {
					document.documentElement.requestFullscreen();
				}
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	return (
		<div className="relative grid">
			<SlideStage
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpc}
				currentPageNumber={pageNumber}
			/>
			<div className="absolute bottom-24 w-full flex justify-center">
				<Menu pdfpcConfig={pdfpc} currentPageNumber={pageNumber} />
			</div>
		</div>
	);
}
