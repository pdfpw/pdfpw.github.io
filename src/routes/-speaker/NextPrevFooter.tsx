import type { PDFDocumentProxy } from "pdfjs-dist";
import { Suspense, use } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";

interface NextPrevFooterProps {
	pdfProxyPromise: Promise<PDFDocumentProxy>;
	pdfpcConfigPromise: Promise<ResolvedPdfpcConfigV2>;
	/**
	 * 0-based current slide index
	 */
	currentPageNumber: number;
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

function NextPrevFooterCore({
	pdfProxyPromise,
	pdfpcConfigPromise,
	currentPageNumber,
}: NextPrevFooterProps) {
	const pdfpcConfig = use(pdfpcConfigPromise);
	const { next, current, prev } = getNextPrev(
		pdfpcConfig.pages.map((p) => p.map(({ pageNumber }) => pageNumber)),
		currentPageNumber,
	);

	return (
		<div className="grid grid-cols-[auto_1fr_auto]">
			{prev === null ? (
				<div className="h-full aspect-video"></div>
			) : (
				<PdfPage
					pdfProxyPromise={pdfProxyPromise}
					pageNumber={prev}
					className="h-full w-[initial] aspect-video"
				/>
			)}
			<div className="text-center">
				{current + 1} / {pdfpcConfig.pages.length}
			</div>
			{next === null ? (
				<div className="h-full aspect-video"></div>
			) : (
				<PdfPage
					pdfProxyPromise={pdfProxyPromise}
					pageNumber={next}
					className="h-full w-[initial] aspect-video"
				/>
			)}
		</div>
	);
}
