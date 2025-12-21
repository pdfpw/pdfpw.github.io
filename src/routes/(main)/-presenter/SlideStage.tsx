import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { RefObject } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { cn } from "#src/lib/utils.ts";

export const SlideStage = function SlideStage({
	pdfProxy,
	pageNumber,
	isFrozen,
	className,
	ref,
}: {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	isFrozen: boolean;
	className?: ClassValue;
	ref?: RefObject<HTMLElement | null>;
}) {
	return (
		<section
			className={cn("relative", className)}
			aria-busy={isFrozen}
			ref={ref}
		>
			<PdfPage
				pdfProxy={pdfProxy}
				pageNumber={pageNumber}
				className={[
					"absolute inset-0",
					{
						"grayscale opacity-50": isFrozen,
					},
				]}
			/>

			{isFrozen && (
				<div
					className={
						"absolute inset-0 grid place-items-center cursor-not-allowed"
					}
				>
					<span className="text-white font-bold text-lg tracking-widest bg-black/50 px-1 rounded-md">
						フリーズ中
					</span>
				</div>
			)}
		</section>
	);
};
