import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "#src/components/PdfPage.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { cn } from "#src/lib/utils.ts";

interface SlideStageProps {
	pdfProxy: PDFDocumentProxy;
	pdfpcConfig: ResolvedPdfpcConfigV2;
	currentPageNumber: number;
	className?: ClassValue;
}

function preloadSlide(
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pageNumber: number,
): number[] {
	const pages = pdfpcConfig.pages.flat();
	const currentIndex = pages.findIndex((p) => p.pageNumber === pageNumber);
	if (currentIndex === -1) return [pageNumber];
	const start = Math.max(0, currentIndex - 10);
	const end = currentIndex + 10;
	return pages.slice(start, end + 1).map((p) => p.pageNumber);
}

// 前後10枚程度を事前に読み込んでおく
export function SlideStage({
	pdfProxy,
	pdfpcConfig,
	currentPageNumber,
	className,
}: SlideStageProps) {
	const preloadPages = preloadSlide(pdfpcConfig, currentPageNumber);
	return (
		<div className={cn("relative", className)}>
			{preloadPages.map((pageNumber) => (
				<PdfPage
					key={pageNumber}
					pdfProxy={pdfProxy}
					pageNumber={pageNumber}
					className={[
						"absolute inset-0",
						{
							"opacity-0 pointer-events-none": pageNumber !== currentPageNumber,
						},
					]}
				/>
			))}
		</div>
	);
}
