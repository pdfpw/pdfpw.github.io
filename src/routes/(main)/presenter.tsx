import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Suspense, use, useRef, useState } from "react";
import * as typia from "typia";
import { Button } from "#src/components/ui/button";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import {
	assertPdfpcConfigV2,
	resolvePdfpcConfig,
} from "#src/lib/pdfpc-config.ts";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import { createUseMemoried } from "#src/lib/use-memoried.ts";
import {
	type BroadcastAction,
	getBroadcastChannel,
	usePresenterBroadcast,
} from "../-broadcast";
import { useSlideShortcut } from "../-hooks/use-slide-shortcut";
import { ModeForm } from "./-presenter/ModeForm";
import { NextPrevFooter } from "./-presenter/NextPrevFooter";
import { NextSlide } from "./-presenter/NextSlide";
import { Note } from "./-presenter/Note";
import { SlideStage } from "./-presenter/SlideStage";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PresenterSearch {
	file?: string;
}

export const Route = createFileRoute("/(main)/presenter")({
	component: RouteComponent,
	validateSearch: typia.createValidate<PresenterSearch>(),
});

function RouteComponent() {
	const {
		state: { pdf, pdfpc },
		search: { file },
	} = useLocation();

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
		<main className="text-foreground min-h-0">
			<Suspense
				fallback={
					<div className="grid h-full max-h-full grid-cols-[auto_1fr] grid-rows-[3fr_1fr] p-4 gap-4">
						<Skeleton className="aspect-video min-h-[calc((100vh-60px)/4*3)]"></Skeleton>
						<div className="row-span-2 flex flex-col gap-4">
							<Skeleton className="h-auto aspect-video max-h-80 w-full"></Skeleton>
							<Skeleton className="flex-1"></Skeleton>
						</div>
						<Skeleton className="w-full min-h-0 h-full"></Skeleton>
					</div>
				}
			>
				<RecentPdfResolver
					fileName={file}
					initialPdf={pdf}
					initialPdfpc={pdfpc}
				/>
			</Suspense>
		</main>
	);
}

const useGetRecentFileById = createUseMemoried(async (fileName: string) =>
	getRecentFileById(await openDb(), fileName),
);
function RecentPdfResolver({
	fileName,
	initialPdf,
	initialPdfpc,
}: {
	fileName: string;
	initialPdf?: File | FileSystemFileHandle;
	initialPdfpc?: File | FileSystemFileHandle;
}) {
	const recentFilePromise = useGetRecentFileById(fileName);
	const recentFile = use(recentFilePromise);
	const pdf = initialPdf ?? recentFile?.handle;
	const pdfpc = initialPdfpc ?? recentFile?.configHandle;

	if (!pdf)
		return (
			<main className="min-h-screen bg-background text-foreground">
				<div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
					<h1 className="text-xl font-semibold">
						指定されたファイルが見つかりません
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

	return <PresenterView pdf={pdf} pdfpc={pdfpc} fileName={fileName} />;
}

async function loadPdf(file: File | FileSystemFileHandle) {
	if (!(file instanceof File)) file = await file.getFile();
	return getDocument(await file.arrayBuffer()).promise;
}

const usePdf = createUseMemoried((file: File | FileSystemFileHandle) => {
	const pdfProxy = loadPdf(file);
	return [
		pdfProxy,
		pdfProxy.then(
			async (p) =>
				(await p.getPageLabels()) ??
				Array.from({ length: p.numPages }, (_, i) => (i + 1).toString()),
		),
	] as const;
});

const usePdfpcConfig = createUseMemoried(
	async (file: File | FileSystemFileHandle | undefined, labels: string[]) => {
		if (!file) return resolvePdfpcConfig(undefined, labels);
		if (!(file instanceof File)) file = await file.getFile();
		const rawConfig = JSON.parse(await file.text());

		return resolvePdfpcConfig(assertPdfpcConfigV2(rawConfig), labels);
	},
);

function PresenterView({
	pdf,
	pdfpc,
	fileName,
}: {
	pdf: File | FileSystemFileHandle;
	pdfpc: File | FileSystemFileHandle | undefined;
	fileName: string;
}) {
	const [pdfProxyPromise, slidePageNumbersPromise] = usePdf(pdf);
	const pdfProxy = use(pdfProxyPromise);
	const slidePageNumbers = use(slidePageNumbersPromise);
	const pdfpcConfigPromise = usePdfpcConfig(pdfpc, slidePageNumbers);
	const pdfpcConfig = use(pdfpcConfigPromise);
	const [pageNumber, setPageNumber] = useState(1);
	const [presentationPageNumber, setPresentationPageNumber] = useState(1);
	const [isFrozen, setIsFrozen] = useState(false);
	if (!isFrozen && pageNumber !== presentationPageNumber)
		setPresentationPageNumber(pageNumber);

	const slideStageRef = useRef<HTMLElement | null>(null);
	const nextSlideRef = useRef<HTMLDivElement | null>(null);
	const nextPrevRef = useRef<HTMLDivElement | null>(null);

	useSlideShortcut(() => {
		setPageNumber((prev) =>
			pdfpcConfig.totalOverlays > prev ? prev + 1 : pdfpcConfig.totalOverlays,
		);
		if (!isFrozen) {
			const channel = getBroadcastChannel(fileName);
			channel.postMessage({
				from: "presenter",
				command: "send-current-page-number",
				pageNumber:
					pdfpcConfig.totalOverlays > pageNumber
						? pageNumber + 1
						: pdfpcConfig.totalOverlays,
			} satisfies BroadcastAction);
		}
	}, () => {
		setPageNumber((prev) => (prev > 1 ? prev - 1 : 1));
		if (!isFrozen) {
			const channel = getBroadcastChannel(fileName);
			channel.postMessage({
				from: "presenter",
				command: "send-current-page-number",
				pageNumber: pageNumber > 1 ? pageNumber - 1 : 1,
			} satisfies BroadcastAction);
		}
	}, [slideStageRef, nextSlideRef, nextPrevRef]);

	usePresenterBroadcast(fileName, pdfpcConfig, pdf);

	return (
		<div className="grid h-full max-h-full grid-cols-[auto_1fr] grid-rows-[3fr_1fr] p-4 gap-4">
			<SlideStage
				pdfProxy={pdfProxy}
				pageNumber={presentationPageNumber}
				isFrozen={isFrozen}
				className="aspect-video min-h-[calc((100vh-100px)/4*3)]"
				ref={slideStageRef}
			/>
			<div className="row-span-2 flex flex-col gap-4">
				<NextSlide
					currentSlidePage={pageNumber}
					pdfProxy={pdfProxy}
					pdfpcConfig={pdfpcConfig}
					ref={nextSlideRef}
				></NextSlide>
				<ModeForm isFrozen={isFrozen} onChangeIsFrozen={setIsFrozen} />
				<Note
					className="flex-1"
					pdfpcConfig={pdfpcConfig}
					pageNumber={pageNumber}
				/>
			</div>
			<NextPrevFooter
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpcConfig}
				currentPageNumber={pageNumber}
				ref={nextPrevRef}
			/>
		</div>
	);
}
