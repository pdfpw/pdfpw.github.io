import type { PDFDocumentProxy } from "pdfjs-dist";
import { memo } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card";
import { PdfCanvas } from "./PdfCanvas";

export const NextSlideCard = memo(function NextSlideCard({
	pdfProxy,
	nextPage,
}: {
	pdfProxy: PDFDocumentProxy;
	nextPage: number | null;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold text-muted-foreground">
					次スライド
				</CardTitle>
			</CardHeader>
			<CardContent>
				{nextPage ? (
					<div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-muted p-2">
						<PdfCanvas
							pdfProxy={pdfProxy}
							pageNumber={nextPage}
							className="h-full w-full"
						/>
					</div>
				) : (
					<div className="text-sm text-muted-foreground">
						次のスライドはありません。
					</div>
				)}
			</CardContent>
		</Card>
	);
});
