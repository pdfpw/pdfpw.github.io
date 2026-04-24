import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ReactNode, RefObject } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { cn } from "#src/lib/utils.ts";

export const SlideStage = function SlideStage({
	pdfProxy,
	pageNumber,
	className,
	ref,
	children,
}: {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	className?: ClassValue;
	ref?: RefObject<HTMLElement | null>;
	children?: ReactNode;
}) {
	return (
		<section className={cn("relative", className)} ref={ref}>
			<PdfPage
				pdfProxy={pdfProxy}
				pageNumber={pageNumber}
				className="absolute inset-0"
			/>
			{children}
		</section>
	);
};
