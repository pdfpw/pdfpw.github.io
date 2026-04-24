import type { PDFDocumentProxy } from "pdfjs-dist";
import { memo } from "react";
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
				"relative flex flex-col items-center gap-2 p-2 rounded-lg border transition-all duration-200",
				"hover:border-border-strong hover:-translate-y-px",
				isSelected
					? "border-accent bg-accent-soft shadow-sm"
					: "border-border bg-raised hover:border-border-strong",
			)}
		>
			<div className="relative aspect-video w-40 overflow-hidden rounded-md bg-surface">
				<PdfPage
					pdfProxy={pdfProxy}
					pageNumber={pageNumber}
					className="w-full h-full"
				/>
			</div>
			{(label || pageNumber) && (
				<span className="font-mono text-[10px] text-muted tabular-nums">
					{label || `${pageNumber}`}
				</span>
			)}
		</button>
	);
});
