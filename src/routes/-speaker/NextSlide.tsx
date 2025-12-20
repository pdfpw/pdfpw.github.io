import type { PDFDocumentProxy } from "pdfjs-dist";
import { Suspense, use } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";

interface NextSlideProps {
	currentSlidePage: number;
	pdfProxyPromise: Promise<PDFDocumentProxy>;
	pdfpcConfigPromise: Promise<ResolvedPdfpcConfigV2>;
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

function NextSlideCore({
	currentSlidePage,
	pdfProxyPromise,
	pdfpcConfigPromise,
}: NextSlideProps) {
	const pdfpcConfig = use(pdfpcConfigPromise);

	const nextPageNumber =
		pdfpcConfig.pages[currentSlidePage + 1]?.at(-1)?.pageNumber;
	return nextPageNumber === undefined ? (
		<div className="h-auto aspect-video max-h-80 w-full"></div>
	) : (
		<PdfPage
			pdfProxyPromise={pdfProxyPromise}
			pageNumber={nextPageNumber}
			className="h-auto aspect-video max-h-80"
		/>
	);
}
