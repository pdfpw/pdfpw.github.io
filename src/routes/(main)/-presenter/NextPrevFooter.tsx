import { ChevronLeftCircleIcon, ChevronRightCircleIcon } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { type RefObject, Suspense } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { Button } from "#src/components/ui/button.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getNextSlidePageNumber } from "./NextSlide";
import { Timer } from "./Timer";

interface NextPrevFooterProps {
	pdfProxy: PDFDocumentProxy;
	pdfpcConfig: ResolvedPdfpcConfigV2;
	/**
	 * 0-based current slide index
	 */
	currentPageNumber: number;
	ref?: RefObject<HTMLDivElement | null>;
	onNextSlide: () => void;
	onPrevSlide: () => void;
}

export function NextPrevFooter(props: NextPrevFooterProps) {
	return (
		<Suspense fallback={<Skeleton className="h-full w-full"></Skeleton>}>
			<NextPrevFooterCore {...props} />
		</Suspense>
	);
}

function getNextPrev(slidePageNumbers: number[][], currentPageNumber: number) {
	let next: number | null = null;
	let prev: number | null = null;
	let current = -1;
	for (const [i, pageNumbers] of slidePageNumbers.entries()) {
		const currentIndex = pageNumbers.indexOf(currentPageNumber);
		if (currentIndex === -1) continue;
		current = i;
		if (currentIndex > 0) prev = pageNumbers.at(currentIndex - 1) ?? null;
		next = pageNumbers.at(currentIndex + 1) ?? null;
		break;
	}
	return { next, current, prev };
}

function getPrevSlidePageNumber(currentPageNumber: number) {
	return currentPageNumber > 1 ? currentPageNumber - 1 : null;
}

function NextPrevFooterCore({
	pdfProxy,
	pdfpcConfig,
	currentPageNumber,
	ref,
	onNextSlide,
	onPrevSlide,
}: NextPrevFooterProps) {
	const { next, current, prev } = getNextPrev(
		pdfpcConfig.pages.map((p) => p.map(({ pageNumber }) => pageNumber)),
		currentPageNumber,
	);

	const nextPageNumber = getNextSlidePageNumber(currentPageNumber, pdfpcConfig);
	const prevPageNumber = getPrevSlidePageNumber(currentPageNumber);

	return (
		<div className="grid grid-cols-[auto_1fr_auto]" ref={ref}>
			{prev === null ? (
				<div className="h-full aspect-video"></div>
			) : (
				<PdfPage
					pdfProxy={pdfProxy}
					pageNumber={prev}
					className="h-full w-auto aspect-video"
				/>
			)}
			<div className="flex flex-col items-center justify-center gap-2">
				<div className="flex items-center justify-center gap-4">
					<Button
						type="button"
						disabled={prevPageNumber === null}
						variant="ghost"
						size="icon-lg"
						onClick={onPrevSlide}
						className="rounded-full"
					>
						<ChevronLeftCircleIcon className="size-7" />
					</Button>
					<div className="text-2xl">
						{current + 1} / {pdfpcConfig.pages.length}
					</div>
					<Button
						type="button"
						disabled={nextPageNumber === null}
						variant="ghost"
						size="icon-lg"
						className="rounded-full"
						onClick={onNextSlide}
					>
						<ChevronRightCircleIcon className="size-7" />
					</Button>
				</div>
				<Timer pdfpcConfig={pdfpcConfig} pageNumber={currentPageNumber} />
			</div>
			{next === null ? (
				<div className="h-full aspect-video"></div>
			) : (
				<PdfPage
					pdfProxy={pdfProxy}
					pageNumber={next}
					className="h-full w-auto aspect-video"
				/>
			)}
		</div>
	);
}
