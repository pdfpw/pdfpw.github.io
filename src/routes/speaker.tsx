import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Suspense, use, useEffect, useEffectEvent, useState } from "react";
import * as typia from "typia";
import { Button } from "#src/components/ui/button";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import {
	assertPdfpcConfigV2,
	type ResolvedPdfpcConfigV2,
	resolvePdfpcConfig,
} from "#src/lib/pdfpc-config.ts";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import { createUseMemoried } from "#src/lib/use-memoried.ts";
import { ModeForm } from "./-speaker/ModeForm";
import { NextPrevFooter } from "./-speaker/NextPrevFooter";
import { NextSlide } from "./-speaker/NextSlide";
import { Note } from "./-speaker/Note";
import { SlideStage } from "./-speaker/SlideStage";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface SpeakerSearch {
	file?: string;
}

export const Route = createFileRoute("/speaker")({
	component: RouteComponent,
	validateSearch: typia.createValidate<SpeakerSearch>(),
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
						<Skeleton className="aspect-video"></Skeleton>
						<div className="row-span-2 flex flex-col gap-4">
							<Skeleton className="h-auto aspect-video max-h-80 w-full"></Skeleton>
							<Skeleton className="flex-1"></Skeleton>
						</div>
						<Skeleton></Skeleton>
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

	return (
		<SpeakerView key={pdf.name} pdf={pdf} pdfpc={pdfpc} fileName={fileName} />
	);
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
	async (
		file: File | FileSystemFileHandle | undefined,
		labelsPromise: Promise<string[]>,
	) => {
		const labels = await labelsPromise;
		if (!file) return resolvePdfpcConfig(undefined, labels);
		if (!(file instanceof File)) file = await file.getFile();
		const rawConfig = JSON.parse(await file.text());

		return resolvePdfpcConfig(assertPdfpcConfigV2(rawConfig), labels);
	},
);

function SpeakerView({
	pdf,
	pdfpc,
}: {
	pdf: File | FileSystemFileHandle;
	pdfpc: File | FileSystemFileHandle | undefined;
	fileName: string;
}) {
	const [pdfProxyPromise, slidePageNumbersPromise] = usePdf(pdf);
	const pdfpcConfigPromise = usePdfpcConfig(pdfpc, slidePageNumbersPromise);
	const [pageNumber, setPageNumber] = useState(1);
	const [presentationPageNumber, setPresentationPageNumber] = useState(1);
	const [isFrozen, setIsFrozen] = useState(false);
	if (!isFrozen && pageNumber !== presentationPageNumber)
		setPresentationPageNumber(pageNumber);

	const moveNextSlide = async () => {
		const pdfpcConfig = await pdfpcConfigPromise;

		console.log(pdfpcConfig);
		setPageNumber((prev) => {
			const a =
				pdfpcConfig.totalOverlays > prev ? prev + 1 : pdfpcConfig.totalOverlays;
			console.log({ a });
			return a;
		});
	};

	const movePrevSlide = async () => {
		setPageNumber((prev) => (prev > 1 ? prev - 1 : 1));
	};

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		switch (event.key) {
			case "ArrowRight":
			case " ":
			case "PageDown":
				event.preventDefault();
				moveNextSlide();
				break;
			case "ArrowLeft":
			case "PageUp":
				event.preventDefault();
				movePrevSlide();
				break;
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	return (
		<div className="grid h-full max-h-full grid-cols-[auto_1fr] grid-rows-[3fr_1fr] p-4 gap-4">
			<SlideStage
				pdfProxyPromise={pdfProxyPromise}
				pdfpcConfigPromise={pdfpcConfigPromise}
				pageNumber={presentationPageNumber}
				isFrozen={isFrozen}
				className="aspect-video min-h-0"
			/>
			<div className="row-span-2 flex flex-col gap-4">
				<NextSlide
					currentSlidePage={pageNumber - 1}
					pdfProxyPromise={pdfProxyPromise}
					pdfpcConfigPromise={pdfpcConfigPromise}
				></NextSlide>
				<ModeForm isFrozen={isFrozen} onChangeIsFrozen={setIsFrozen} />
				<Note
					className="flex-1"
					pdfpcConfigPromise={pdfpcConfigPromise}
					pageNumber={pageNumber}
				/>
			</div>
			<NextPrevFooter
				pdfProxyPromise={pdfProxyPromise}
				pdfpcConfigPromise={pdfpcConfigPromise}
				currentPageNumber={pageNumber}
			/>
		</div>
	);
}
