import type { PDFDocumentProxy } from "pdfjs-dist";
import { type RefObject, Suspense } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";

interface NextSlideProps {
	currentSlidePage: number;
	pdfProxy: PDFDocumentProxy;
	pdfpcConfig: ResolvedPdfpcConfigV2;
	ref: RefObject<HTMLDivElement | null>;
}

export function NextSlide(props: NextSlideProps) {
	return (
		<Suspense
			fallback={
				<Skeleton className="h-auto aspect-video max-h-80 w-full"></Skeleton>
			}
		>
			<NextSlideCore {...props} />
		</Suspense>
	);
}

function getNextSlidePageNumber(
	currentPageNumber: number,
	pdfpcConfig: ResolvedPdfpcConfigV2,
) {
	const currentIndex = pdfpcConfig.pages.findIndex((pageGroup) =>
		pageGroup.some(({ pageNumber }) => pageNumber === currentPageNumber),
	);
	if (currentIndex === -1) return null;
	return currentIndex < pdfpcConfig.pages.length - 1
		? pdfpcConfig.pages[currentIndex + 1].at(-1)!.pageNumber
		: null;
}

function NextSlideCore({
	currentSlidePage,
	pdfProxy,
	pdfpcConfig,
	ref,
}: NextSlideProps) {
	const nextPageNumber = getNextSlidePageNumber(currentSlidePage, pdfpcConfig);
	console.log({ nextPageNumber, currentSlidePage });
	return nextPageNumber === null ? (
		<div
			className="h-auto aspect-video max-h-80 w-full min-h-0"
			ref={ref}
		></div>
	) : (
		<PdfPage
			pdfProxy={pdfProxy}
			pageNumber={nextPageNumber}
			className="h-auto aspect-video max-h-80"
			ref={ref}
		/>
	);
}
