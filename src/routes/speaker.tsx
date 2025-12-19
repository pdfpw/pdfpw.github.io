import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { GlobalWorkerOptions, type PDFDocumentLoadingTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
	Suspense,
	use,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import * as typia from "typia";
import { Button } from "#src/components/ui/button";
import { Skeleton } from "#src/components/ui/skeleton";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import { usePdf } from "../lib/use-pdf.ts";
import { NextSlideCard } from "./~speaker/NextSlideCard";
import { NotesCard } from "./~speaker/NotesCard";
import { OverviewModal } from "./~speaker/OverviewModal";
import { ProgressCard } from "./~speaker/ProgressCard";
import { SlideStage } from "./~speaker/SlideStage";
import { SpeakerHeader } from "./~speaker/SpeakerHeader";
import { TimerCard } from "./~speaker/TimerCard";
import { ToolsCard } from "./~speaker/ToolsCard";
import type { ToolMode } from "./~speaker/tooling";
import { TOOL_OPTIONS } from "./~speaker/tooling";
import { usePresentationTimer } from "./~speaker/usePresentationTimer";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
// pdfjs.GlobalWorkerOptions

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
		<main className="min-h-screen bg-background text-foreground">
			<Suspense
				fallback={
					<div className="flex min-h-screen items-center justify-center px-6 py-12">
						<div className="w-full max-w-3xl space-y-6">
							<div className="flex items-center justify-between gap-4">
								<div className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-6 w-64" />
								</div>
								<div className="flex gap-3">
									<Skeleton className="h-9 w-24" />
									<Skeleton className="h-9 w-28" />
								</div>
							</div>
							<div className="rounded-xl border border-border bg-card p-4">
								<Skeleton className="h-[420px] w-full" />
							</div>
							<div className="grid gap-4 md:grid-cols-3">
								<Skeleton className="h-40 w-full" />
								<Skeleton className="h-40 w-full" />
								<Skeleton className="h-40 w-full" />
							</div>
						</div>
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

function RecentPdfResolver({
	fileName,
	initialPdf,
	initialPdfpc,
}: {
	fileName: string;
	initialPdf?: File | FileSystemFileHandle;
	initialPdfpc?: File | FileSystemFileHandle;
}) {
	const recentFile = use(getRecentFileById(use(openDb()), fileName));
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

	return <Pdf key={pdf.name} pdf={pdf} pdfpc={pdfpc} fileName={fileName} />;
}

function Pdf({
	pdf,
	pdfpc,
	fileName,
}: {
	pdf: File | FileSystemFileHandle;
	pdfpc: File | FileSystemFileHandle | undefined;
	fileName: string;
}) {
	const [pdfDocument] = usePdf(pdf);

	return (
		<SpeakerView
			pdfDocument={pdfDocument}
			fileName={fileName}
			hasConfig={!!pdfpc}
		/>
	);
}

function SpeakerView({
	pdfDocument,
	fileName,
	hasConfig,
}: {
	pdfDocument: Promise<PDFDocumentLoadingTask>;
	fileName: string;
	hasConfig: boolean;
}) {
	const loadingTask = use(pdfDocument);
	const pdfProxy = use(loadingTask.promise);
	const totalPages = pdfProxy.numPages;
	const [pageNumber, setPageNumber] = useState(1);
	const [toolMode, setToolMode] = useState<ToolMode>("none");
	const [toolSize, setToolSize] = useState(12);
	const [isOverviewOpen, setIsOverviewOpen] = useState(false);
	const [isFrozen, setIsFrozen] = useState(false);
	const [isBlackout, setIsBlackout] = useState(false);
	const [notesByPage, setNotesByPage] = useState<Record<number, string>>({});
	const [isNoteEditing, setIsNoteEditing] = useState(false);
	const [audienceStatus, setAudienceStatus] = useState<string | null>(null);
	const gotoInputRef = useRef<HTMLInputElement>(null);
	const gotoInputId = useId();

	const pageNumbers = useMemo(
		() => Array.from({ length: totalPages }, (_, idx) => idx + 1),
		[totalPages],
	);

	const { elapsedMs, isRunning, pause, reset, start, autoStartIfNeeded } =
		usePresentationTimer(pageNumber);

	const clampPage = useCallback(
		(nextPage: number) => Math.min(totalPages, Math.max(1, nextPage)),
		[totalPages],
	);

	const goToPage = useCallback(
		(nextPage: number) => {
			const clamped = clampPage(nextPage);
			setPageNumber(clamped);
			autoStartIfNeeded(clamped);
		},
		[autoStartIfNeeded, clampPage],
	);

	const goToPageDelta = useCallback(
		(delta: number) => {
			setPageNumber((current) => {
				const nextPage = clampPage(current + delta);
				autoStartIfNeeded(nextPage);
				return nextPage;
			});
		},
		[autoStartIfNeeded, clampPage],
	);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented) return;
			const target = event.target as HTMLElement | null;
			if (isNoteEditing) {
				if (event.key === "Escape") {
					event.preventDefault();
					setIsNoteEditing(false);
				}
				return;
			}
			const isTypingTarget =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable;
			if (isTypingTarget) return;

			switch (event.key) {
				case "PageDown":
				case "Enter":
				case " ":
				case "ArrowRight": {
					event.preventDefault();
					goToPageDelta(1);
					break;
				}
				case "PageUp":
				case "ArrowLeft": {
					event.preventDefault();
					goToPageDelta(-1);
					break;
				}
				case "Tab": {
					event.preventDefault();
					setIsOverviewOpen((prev) => !prev);
					break;
				}
				case "g": {
					event.preventDefault();
					gotoInputRef.current?.focus();
					gotoInputRef.current?.select();
					break;
				}
				case "1":
				case "2":
				case "3":
				case "4":
				case "5": {
					const match = TOOL_OPTIONS.find((option) => option.key === event.key);
					if (match) {
						event.preventDefault();
						setToolMode(match.value);
					}
					break;
				}
				case "+":
				case "=":
				case "*": {
					event.preventDefault();
					setToolSize((prev) => Math.min(64, prev + 2));
					break;
				}
				case "-": {
					event.preventDefault();
					setToolSize((prev) => Math.max(4, prev - 2));
					break;
				}
				case "f": {
					event.preventDefault();
					setIsFrozen((prev) => !prev);
					break;
				}
				case "b": {
					event.preventDefault();
					setIsBlackout((prev) => !prev);
					break;
				}
				case "s": {
					event.preventDefault();
					start();
					break;
				}
				case "p": {
					event.preventDefault();
					pause();
					break;
				}
				case "n": {
					if (event.ctrlKey) {
						event.preventDefault();
						setIsNoteEditing(true);
					}
					break;
				}
				case "t": {
					if (event.ctrlKey) {
						event.preventDefault();
						reset();
					}
					break;
				}
				default:
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [goToPageDelta, isNoteEditing, pause, reset, start]);

	const noteValue = notesByPage[pageNumber] ?? "";
	const nextPage = pageNumber < totalPages ? pageNumber + 1 : null;
	const progress = totalPages ? (pageNumber / totalPages) * 100 : 0;

	const handleNotesChange = useCallback(
		(value: string) => {
			setNotesByPage((prev) => ({ ...prev, [pageNumber]: value }));
		},
		[pageNumber],
	);

	const handleAudienceOpen = useCallback(() => {
		const nextUrl = `/audiance?file=${encodeURIComponent(fileName)}`;
		const opened = window.open(nextUrl, "pdfpw-audience");
		if (!opened) {
			setAudienceStatus(
				"ポップアップがブロックされました。ブラウザ設定を確認してください。",
			);
		} else {
			setAudienceStatus(null);
		}
	}, [fileName]);

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<SpeakerHeader
				fileName={fileName}
				hasConfig={hasConfig}
				pageNumber={pageNumber}
				totalPages={totalPages}
				audienceStatus={audienceStatus}
				onOpenOverview={() => setIsOverviewOpen(true)}
				onOpenAudience={handleAudienceOpen}
			/>

			<div className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row">
				<SlideStage
					pdfProxy={pdfProxy}
					pageNumber={pageNumber}
					toolMode={toolMode}
					toolSize={toolSize}
					isBlackout={isBlackout}
					isFrozen={isFrozen}
				/>

				<aside className="flex w-full flex-col gap-4 lg:w-80">
					<NextSlideCard pdfProxy={pdfProxy} nextPage={nextPage} />
					<ProgressCard
						pageNumber={pageNumber}
						totalPages={totalPages}
						progress={progress}
						gotoInputRef={gotoInputRef}
						gotoInputId={gotoInputId}
						onGoto={goToPage}
					/>
					<TimerCard
						elapsedMs={elapsedMs}
						isRunning={isRunning}
						onPause={pause}
						onStart={start}
						onReset={reset}
					/>
					<NotesCard
						noteValue={noteValue}
						isNoteEditing={isNoteEditing}
						pageNumber={pageNumber}
						onNoteChange={handleNotesChange}
					/>
					<ToolsCard
						toolMode={toolMode}
						toolSize={toolSize}
						onSelectTool={setToolMode}
						onDecreaseToolSize={() =>
							setToolSize((prev) => Math.max(4, prev - 2))
						}
						onIncreaseToolSize={() =>
							setToolSize((prev) => Math.min(64, prev + 2))
						}
						isFrozen={isFrozen}
						isBlackout={isBlackout}
						onToggleFreeze={() => setIsFrozen((prev) => !prev)}
						onToggleBlackout={() => setIsBlackout((prev) => !prev)}
					/>
				</aside>
			</div>

			{isOverviewOpen ? (
				<OverviewModal
					pageNumbers={pageNumbers}
					currentPage={pageNumber}
					pdfProxy={pdfProxy}
					onClose={() => setIsOverviewOpen(false)}
					onSelectPage={(page) => {
						goToPage(page);
						setIsOverviewOpen(false);
					}}
				/>
			) : null}
		</div>
	);
}
