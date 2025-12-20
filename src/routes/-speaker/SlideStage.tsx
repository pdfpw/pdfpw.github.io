import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { use } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { cn } from "#src/lib/utils.ts";

export const SlideStage = function SlideStage({
	pdfProxyPromise,
	pdfpcConfigPromise,
	pageNumber,
	isFrozen,
	className,
}: {
	pdfProxyPromise: Promise<PDFDocumentProxy>;
	pdfpcConfigPromise: Promise<ResolvedPdfpcConfigV2>;
	pageNumber: number;
	isFrozen: boolean;
	className?: ClassValue;
}) {
	return (
		<section className={cn("relative", className)} aria-busy={isFrozen}>
			<Slides
				pdfProxyPromise={pdfProxyPromise}
				pdfpcConfigPromise={pdfpcConfigPromise}
				isFrozen={isFrozen}
				pageNumber={pageNumber}
			></Slides>

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

function Slides({
	pdfProxyPromise,
	pdfpcConfigPromise,
	isFrozen,
	pageNumber,
}: {
	pdfProxyPromise: Promise<PDFDocumentProxy>;
	pdfpcConfigPromise: Promise<ResolvedPdfpcConfigV2>;
	isFrozen: boolean;
	pageNumber: number;
}) {
	const pdfpcConfig = use(pdfpcConfigPromise);

	return (
		<>
			{pdfpcConfig.pages.flat().map((p) => (
				<PdfPage
					key={p.pageNumber}
					pdfProxyPromise={pdfProxyPromise}
					pageNumber={p.pageNumber}
					className={[
						"absolute inset-0",
						{
							"opacity-0 pointer-events-none": p.pageNumber !== pageNumber,
							"grayscale opacity-50": p.pageNumber === pageNumber && isFrozen,
						},
					]}
				/>
			))}
		</>
	);
}
