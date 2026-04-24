import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { RefObject } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { cn } from "#src/lib/utils.ts";

export const SlideStage = function SlideStage({
	pdfProxy,
	pageNumber,
	className,
	ref,
	pdfAreaRef,
}: {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	className?: ClassValue;
	ref?: RefObject<HTMLElement | null>;
	pdfAreaRef?: RefObject<HTMLDivElement | null>;
}) {
	return (
		<section
			className={cn(
				"relative overflow-hidden rounded-lg border border-border bg-raised",
				className,
			)}
			ref={ref}
		>
			<PdfPage
				pdfProxy={pdfProxy}
				pageNumber={pageNumber}
				className="absolute inset-0"
				pdfAreaRef={pdfAreaRef}
			/>
			<span className="pointer-events-none absolute bottom-2.5 left-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
				SLIDE {pageNumber} / {pdfProxy.numPages}
			</span>
		</section>
	);
};
