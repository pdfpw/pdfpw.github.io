import { memo } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "#src/components/PdfPage";
import { cn } from "#src/lib/utils";

interface OverviewThumbnailProps {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	isSelected: boolean;
	onSelect: () => void;
	label?: string;
}

export const OverviewThumbnail = memo(function OverviewThumbnail({
	pdfProxy,
	pageNumber,
	isSelected,
	onSelect,
	label,
}: OverviewThumbnailProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"relative flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all duration-200",
				"hover:scale-105 hover:shadow-lg",
				isSelected
					? "border-primary bg-primary/10 shadow-md"
					: "border-border bg-card hover:border-primary/50",
			)}
		>
			<div className="relative aspect-video w-40 overflow-hidden rounded bg-background">
				<PdfPage pdfProxy={pdfProxy} pageNumber={pageNumber} className="w-full h-full" />
			</div>
			{(label || pageNumber) && (
				<span className="text-xs font-medium text-foreground">
					{label || `${pageNumber}`}
				</span>
			)}
		</button>
	);
});
