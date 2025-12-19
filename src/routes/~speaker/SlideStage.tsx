import type { PDFDocumentProxy } from "pdfjs-dist";
import { memo } from "react";
import { PdfCanvas } from "./PdfCanvas";
import type { ToolMode } from "./tooling";
import { toolModeLabel } from "./tooling";

export const SlideStage = memo(function SlideStage({
	pdfProxy,
	pageNumber,
	toolMode,
	toolSize,
	isBlackout,
	isFrozen,
}: {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	toolMode: ToolMode;
	toolSize: number;
	isBlackout: boolean;
	isFrozen: boolean;
}) {
	return (
		<section className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-medium text-muted-foreground">
					現在スライド
				</h2>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{toolModeLabel(toolMode)}</span>
					<span>サイズ {toolSize}</span>
				</div>
			</div>
			<div className="relative flex min-h-[60vh] flex-1 items-center justify-center rounded-xl border border-border bg-muted p-4">
				<PdfCanvas
					pdfProxy={pdfProxy}
					pageNumber={pageNumber}
					className="h-full w-full"
				/>
				{isBlackout ? (
					<div className="absolute inset-0 flex items-center justify-center rounded-xl bg-foreground/90 text-background text-lg font-semibold">
						ブラックアウト中
					</div>
				) : null}
				{isFrozen ? (
					<div className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
						Freeze
					</div>
				) : null}
			</div>
		</section>
	);
});
