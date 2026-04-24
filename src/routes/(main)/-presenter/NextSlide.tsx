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
				<Skeleton className="h-auto aspect-video max-h-80 w-full rounded-lg" />
			}
		>
			<NextSlideCore {...props} />
		</Suspense>
	);
}

export function getNextSlidePageNumber(
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

	return (
		<div ref={ref} className="rounded-lg border border-border bg-raised p-2.5">
			<div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
				<span>Next</span>
				{nextPageNumber !== null && (
					<span>
						{nextPageNumber} / {pdfProxy.numPages}
					</span>
				)}
			</div>
			{nextPageNumber === null ? (
				<div className="aspect-video w-full max-h-80 rounded-md bg-surface" />
			) : (
				<PdfPage
					pdfProxy={pdfProxy}
					pageNumber={nextPageNumber}
					className="aspect-video w-full max-h-80 rounded-md overflow-hidden"
				/>
			)}
		</div>
	);
}
