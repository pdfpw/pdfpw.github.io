import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Suspense, startTransition, useRef, useState } from "react";
import * as typia from "typia";
import {
	type BroadcastAction,
	ensurePresenterPairId,
	getBroadcastChannel,
	usePresenterBroadcast,
} from "#src/broadcast";
import { Button } from "#src/components/ui/button";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import { useSlideShortcut } from "../-hooks/use-slide-shortcut";
import { ModeForm } from "./-presenter/ModeForm";
import { NextPrevFooter } from "./-presenter/NextPrevFooter";
import { NextSlide } from "./-presenter/NextSlide";
import { Note } from "./-presenter/Note";
import { SlideStage } from "./-presenter/SlideStage";
import {
	fileNameOrFileAtom,
	pdfFileAtom,
	pdfProxyAtom,
	pdfpcConfigAtom,
} from "./-presenter/state";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PresenterSearch {
	file?: string;
}

export const Route = createFileRoute("/(main)/presenter")({
	component: RouteComponent,
	validateSearch: typia.createValidate<PresenterSearch>(),
});

function MissingFileScreen({ title }: { title: string }) {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
				<h1 className="text-xl font-semibold">{title}</h1>
				<p className="text-muted-foreground">
					ホームに戻って再度ファイルを選択してください。
				</p>
				<Button asChild className="w-fit">
					<Link to="/">ホームへ戻る</Link>
				</Button>
			</div>
		</main>
	);
}

function LoadingSkeleton() {
	return (
		<div className="grid h-full max-h-full grid-cols-[auto_1fr] grid-rows-[3fr_1fr] p-4 gap-4">
			<Skeleton className="aspect-video min-h-[calc((100vh-60px)/4*3)]"></Skeleton>
			<div className="row-span-2 flex flex-col gap-4">
				<Skeleton className="h-auto aspect-video max-h-80 w-full"></Skeleton>
				<Skeleton className="flex-1"></Skeleton>
			</div>
			<Skeleton className="w-full min-h-0 h-full"></Skeleton>
		</div>
	);
}

function RouteComponent() {
	const { file } = Route.useSearch({
		select: ({ file }) => ({ file }),
	});

	if (!file) return <MissingFileScreen title="ファイルが指定されていません" />;

	return (
		<main className="text-foreground min-h-0">
			<Suspense fallback={<LoadingSkeleton />}>
				<PresenterView fileName={file} />
			</Suspense>
		</main>
	);
}

function PresenterView({ fileName }: { fileName: string }) {
	const loading = useAtomValue(fileNameOrFileAtom) === null;
	const { pdf } = useAtomValue(pdfFileAtom) ?? {};

	if (loading) return <LoadingSkeleton />;
	if (!pdf)
		return <MissingFileScreen title="指定されたファイルが見つかりません" />;

	return <PresenterContent pdf={pdf} fileName={fileName} />;
}

function PresenterContent({ pdf, fileName }: { pdf: File; fileName: string }) {
	const pairId = ensurePresenterPairId(fileName);
	const pdfProxy = useAtomValue(pdfProxyAtom);
	const pdfpcConfig = useAtomValue(pdfpcConfigAtom);
	const [pageNumber, setPageNumber] = useState(1);
	const [isFrozen, setIsFrozen] = useState(false);
	const [isBlackout, setIsBlackout] = useState(false);

	const slideStageRef = useRef<HTMLElement | null>(null);
	const nextSlideRef = useRef<HTMLDivElement | null>(null);
	const nextPrevRef = useRef<HTMLDivElement | null>(null);

	const getNextPageNumber = () =>
		pdfpcConfig.totalOverlays > pageNumber
			? pageNumber + 1
			: pdfpcConfig.totalOverlays;
	const getPrevPageNumber = () => (pageNumber > 1 ? pageNumber - 1 : 1);
	const sendCurrentPageNumber = (nextPageNumber: number) => {
		const channel = getBroadcastChannel(fileName, pairId);
		channel.postMessage({
			from: "presenter",
			command: "send-current-page-number",
			pageNumber: nextPageNumber,
		} satisfies BroadcastAction);
	};

	const nextSlide = () => {
		startTransition(() => {
			setPageNumber(() => getNextPageNumber());
		});
		if (!isFrozen) {
			sendCurrentPageNumber(getNextPageNumber());
		}
	};

	const prevSlide = () => {
		startTransition(() => {
			setPageNumber(() => getPrevPageNumber());
		});
		if (!isFrozen) {
			sendCurrentPageNumber(getPrevPageNumber());
		}
	};

	const handleBlackoutChange = (nextIsBlackout: boolean) => {
		setIsBlackout(nextIsBlackout);
		const channel = getBroadcastChannel(fileName, pairId);
		channel.postMessage({
			from: "presenter",
			command: "send-blackout-state",
			isBlackout: nextIsBlackout,
		} satisfies BroadcastAction);
	};
	const handleFrozenChange = (nextIsFrozen: boolean) => {
		setIsFrozen(nextIsFrozen);
		if (!nextIsFrozen) {
			sendCurrentPageNumber(pageNumber);
		}
	};

	useSlideShortcut(nextSlide, prevSlide, [
		slideStageRef,
		nextSlideRef,
		nextPrevRef,
	]);

	usePresenterBroadcast(fileName, pairId, pdfpcConfig, pdf, isBlackout);

	return (
		<div className="grid h-full max-h-full grid-cols-[auto_1fr] grid-rows-[3fr_1fr] p-4 gap-4">
			<SlideStage
				pdfProxy={pdfProxy}
				pageNumber={pageNumber}
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
				<ModeForm
					isFrozen={isFrozen}
					onFrozenChange={handleFrozenChange}
					isBlackout={isBlackout}
					onBlackoutChange={handleBlackoutChange}
				/>
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
				onNextSlide={nextSlide}
				onPrevSlide={prevSlide}
			/>
		</div>
	);
}
