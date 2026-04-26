import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import * as m from "#src/paraglide/messages.js";
import { GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
	Suspense,
	startTransition,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import * as typia from "typia";
import {
	type BroadcastAction,
	ensurePresenterPairId,
	getBroadcastChannel,
	sendTool,
	usePresenterBroadcast,
	useToolBroadcast,
} from "#src/broadcast";
import { KeybindingHelpDialog } from "#src/components/KeybindingHelpDialog";
import { KeybindingHintToast } from "#src/components/KeybindingHintToast";
import { OverviewDialog } from "#src/components/OverviewDialog";
import { PointerOverlay } from "#src/components/PointerOverlay.tsx";
import { Button } from "#src/components/ui/button";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import { useKeybindingHelp } from "#src/hooks/use-keybinding-help";
import {
	clampPageNumber,
	getNextUserSlidePageNumber,
	getPrevUserSlidePageNumber,
} from "#src/lib/navigation-utils.ts";
import { clearPenStrokes } from "#src/lib/pointer-state.ts";
import { usePointerEmitter } from "#src/routes/-hooks/use-pointer-emitter";
import { useSlideShortcut } from "#src/routes/-hooks/use-slide-shortcut";
import { useToolShortcut } from "#src/routes/-hooks/use-tool-shortcut";
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
import type { TimerHandle } from "./-presenter/Timer";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PresenterSearch {
	file?: string;
}

export const Route = createFileRoute("/$locale/(main)/presenter")({
	component: RouteComponent,
	validateSearch: typia.createValidate<PresenterSearch>(),
});

function MissingFileScreen({ title }: { title: string }) {
	const { locale } = Route.useParams();
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
				<h1 className="text-xl font-semibold">{title}</h1>
				<p className="text-muted-foreground">
					{m.presenter_missing_back_message()}
				</p>
				<Button asChild className="w-fit">
					<Link to="/$locale" params={{ locale }}>{m.presenter_back_home()}</Link>
				</Button>
			</div>
		</main>
	)
}

function LoadingSkeleton() {
	return (
		<div className="grid h-full max-h-full grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)] grid-rows-[3fr_1fr] p-4 gap-4">
			<Skeleton className="aspect-video h-full max-w-full place-self-center"></Skeleton>
			<div className="row-span-2 flex flex-col gap-4">
				<Skeleton className="h-auto aspect-video max-h-80 w-full"></Skeleton>
				<Skeleton className="flex-1"></Skeleton>
			</div>
			<Skeleton className="w-full min-h-0 h-full"></Skeleton>
		</div>
	)
}

function RouteComponent() {
	const { file } = Route.useSearch({
		select: ({ file }) => ({ file }),
	})

	if (!file) return <MissingFileScreen title={m.presenter_missing_no_file_title()} />;

	return (
		<main className="text-foreground min-h-0">
			<Suspense fallback={<LoadingSkeleton />}>
				<PresenterView fileName={file} />
			</Suspense>
		</main>
	)
}

function PresenterView({ fileName }: { fileName: string }) {
	const loading = useAtomValue(fileNameOrFileAtom) === null;
	const { pdf } = useAtomValue(pdfFileAtom) ?? {};

	if (loading) return <LoadingSkeleton />;
	if (!pdf)
		return <MissingFileScreen title={m.presenter_missing_not_found_title()} />;

	return <PresenterContent pdf={pdf} fileName={fileName} />;
}

function PresenterContent({ pdf, fileName }: { pdf: File; fileName: string }) {
	const pairId = ensurePresenterPairId(fileName);
	const pdfProxy = useAtomValue(pdfProxyAtom);
	const pdfpcConfig = useAtomValue(pdfpcConfigAtom);
	const [pageNumber, setPageNumber] = useState(1);
	const [isFrozen, setIsFrozen] = useState(false);
	const [isBlackout, setIsBlackout] = useState(false);
	// 履歴管理（ジャンプ操作時の位置を記録）
	const [history, setHistory] = useState<number[]>([]);
	// オーバービューモード
	const [isOverviewMode, setIsOverviewMode] = useState(false);

	const slideStageRef = useRef<HTMLElement | null>(null);
	const pdfAreaRef = useRef<HTMLDivElement | null>(null);
	const nextSlideRef = useRef<HTMLDivElement | null>(null);
	const nextPrevRef = useRef<HTMLDivElement | null>(null);
	const timerRef = useRef<TimerHandle | null>(null);

	// ページ番号を設定して、プレゼンテーション画面に送信するヘルパー関数
	const setPageNumberWithBroadcast = useCallback(
		(nextPageNumber: number, recordHistory: boolean = false) => {
			const clampedPageNumber = clampPageNumber(
				nextPageNumber,
				pdfpcConfig.totalOverlays,
			)
			startTransition(() => {
				if (recordHistory) {
					setHistory((prev) => [...prev, pageNumber]);
				}
				setPageNumber(clampedPageNumber);
			})
			if (!isFrozen) {
				const channel = getBroadcastChannel(fileName, pairId);
				channel.postMessage({
					from: "presenter",
					command: "send-current-page-number",
					pageNumber: clampedPageNumber,
				} satisfies BroadcastAction);
			}
		},
		[fileName, isFrozen, pageNumber, pairId, pdfpcConfig.totalOverlays],
	)

	const getNextPageNumber = () => {
		const next = pageNumber + 1;
		return next <= pdfpcConfig.totalOverlays ? next : pdfpcConfig.totalOverlays;
	}

	const getPrevPageNumber = () => {
		const prev = pageNumber - 1;
		return prev >= 1 ? prev : 1;
	}

	const nextSlide = () => {
		setPageNumberWithBroadcast(getNextPageNumber());
	}

	const prevSlide = () => {
		setPageNumberWithBroadcast(getPrevPageNumber());
	}

	// 10スライドスキップ
	const next10Slides = () => {
		setPageNumberWithBroadcast(pageNumber + 10);
	}

	const prev10Slides = () => {
		setPageNumberWithBroadcast(pageNumber - 10);
	}

	// 最初/最後のスライドへジャンプ
	const jumpToFirstSlide = () => {
		setPageNumberWithBroadcast(1, true);
	}

	const jumpToLastSlide = () => {
		setPageNumberWithBroadcast(pdfpcConfig.totalOverlays, true);
	}

	// ユーザースライド（オーバーレイグループ）単位の移動
	const nextUserSlide = () => {
		const nextPageNumber = getNextUserSlidePageNumber(
			pdfpcConfig.pages,
			pageNumber,
		)
		if (nextPageNumber !== null) {
			setPageNumberWithBroadcast(nextPageNumber);
		}
	}

	const prevUserSlide = () => {
		const prevPageNumber = getPrevUserSlidePageNumber(
			pdfpcConfig.pages,
			pageNumber,
		)
		if (prevPageNumber !== null) {
			setPageNumberWithBroadcast(prevPageNumber);
		}
	}

	// スライド番号指定ジャンプ
	const jumpToSlide = (slideNumber: number) => {
		setPageNumberWithBroadcast(slideNumber, true);
	}

	// 履歴を戻る
	const goBackInHistory = () => {
		if (history.length > 0) {
			const prevPage = history[history.length - 1];
			setHistory((prev) => prev.slice(0, -1));
			setPageNumberWithBroadcast(prevPage, false);
		}
	}

	// オーバービューモードの切り替え
	const toggleOverviewMode = () => {
		setIsOverviewMode((prev) => !prev);
	}

	// タイマーリセット
	const resetTimer = () => {
		timerRef.current?.reset();
	}

	const handleBlackoutChange = (nextIsBlackout: boolean) => {
		setIsBlackout(nextIsBlackout);
		const channel = getBroadcastChannel(fileName, pairId);
		channel.postMessage({
			from: "presenter",
			command: "send-blackout-state",
			isBlackout: nextIsBlackout,
		} satisfies BroadcastAction);
	}
	const handleFrozenChange = (nextIsFrozen: boolean) => {
		setIsFrozen(nextIsFrozen);
		if (!nextIsFrozen) {
			// フリーズ解除時に現在のページを送信
			setPageNumberWithBroadcast(pageNumber);
		}
	}

	useSlideShortcut(
		{
			moveNextSlide: nextSlide,
			movePrevSlide: prevSlide,
			moveNext10Slides: next10Slides,
			movePrev10Slides: prev10Slides,
			jumpToFirstSlide,
			jumpToLastSlide,
			moveNextUserSlide: nextUserSlide,
			movePrevUserSlide: prevUserSlide,
			startJumpToSlide: () => {}, // ハンドルは useSlideShortcut 内部で行われる
			jumpToSlide,
			goBackInHistory,
			toggleOverviewMode,
			resetTimer,
		},
		[slideStageRef, nextSlideRef, nextPrevRef],
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: nextSlide 等は毎レンダーで作り直される
	const handleNavigate = useCallback(
		(direction: "next" | "prev" | "home" | "end") => {
			switch (direction) {
				case "next":
					nextSlide()
					break
				case "prev":
					prevSlide()
					break
				case "home":
					jumpToFirstSlide();
					break
				case "end":
					jumpToLastSlide();
					break
			}
		},
		[pageNumber, pdfpcConfig.totalOverlays],
	)

	usePresenterBroadcast(
		fileName,
		pairId,
		pdfpcConfig,
		pdf,
		isBlackout,
		pageNumber,
		handleNavigate,
	)

	useToolBroadcast(fileName, pairId, "presenter");
	useToolShortcut(fileName, pairId, "presenter");
	usePointerEmitter(pdfAreaRef, fileName, pairId, "presenter");
	const help = useKeybindingHelp("presenter");

	// ページ遷移時にペンストロークを自動クリア（初回マウント時の無駄な broadcast は避ける）
	const doClearStrokes = useSetAtom(clearPenStrokes);
	const prevPageNumberRef = useRef(pageNumber);
	useEffect(() => {
		if (prevPageNumberRef.current === pageNumber) return;
		prevPageNumberRef.current = pageNumber;
		doClearStrokes();
		sendTool(fileName, pairId, "presenter", { command: "pen-clear" });
	}, [pageNumber, fileName, pairId, doClearStrokes]);

	return (
		<>
			<div className="grid h-full max-h-full grid-cols-[minmax(0,1fr)_clamp(280px,28vw,420px)] grid-rows-[3fr_minmax(0,1fr)] gap-3 bg-bg p-4">
				<SlideStage
					pdfProxy={pdfProxy}
					pageNumber={pageNumber}
					className="aspect-video h-full max-w-full place-self-center"
					ref={slideStageRef}
					pdfAreaRef={pdfAreaRef}
				/>
				<PointerOverlay containerRef={pdfAreaRef} />
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
						onOverviewModeOpen={() => setIsOverviewMode(true)}
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
					timerRef={timerRef}
					onNextSlide={nextSlide}
					onPrevSlide={prevSlide}
				/>
			</div>
			<OverviewDialog
				pdfProxy={pdfProxy}
				pdfpcConfig={pdfpcConfig}
				currentSlide={pageNumber}
				open={isOverviewMode}
				onClose={() => setIsOverviewMode(false)}
				onSlideSelect={jumpToSlide}
			/>
			<KeybindingHelpDialog
				open={help.isOpen}
				onOpenChange={(o) => (o ? help.open() : help.close())}
			/>
			{help.shouldShowHint && pdfProxy && (
				<KeybindingHintToast visible onDismiss={help.dismissHint} />
			)}
		</>
	)
}
