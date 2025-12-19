import type { PDFDocumentProxy } from "pdfjs-dist";
import { memo, Suspense } from "react";
import { Button } from "#src/components/ui/button";
import { Skeleton } from "#src/components/ui/skeleton";
import { cn } from "#src/lib/utils";
import { PdfCanvas } from "./PdfCanvas";

export const OverviewModal = memo(function OverviewModal({
	pageNumbers,
	currentPage,
	pdfProxy,
	onClose,
	onSelectPage,
}: {
	pageNumbers: number[];
	currentPage: number;
	pdfProxy: PDFDocumentProxy;
	onClose: () => void;
	onSelectPage: (page: number) => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-background/95">
			<div className="flex items-center justify-between border-b border-border px-6 py-4">
				<h2 className="text-lg font-semibold">Overview</h2>
				<Button variant="outline" onClick={onClose}>
					閉じる
				</Button>
			</div>
			<div className="flex-1 overflow-auto px-6 py-6">
				<Suspense
					fallback={
						<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
							{Array.from({ length: 8 }, (_, index) => (
								<div
									key={`skeleton-${index + 1}`}
									className="rounded-lg border border-border bg-card p-3"
								>
									<Skeleton className="aspect-[16/9] w-full" />
									<Skeleton className="mt-2 h-3 w-20" />
								</div>
							))}
						</div>
					}
				>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
						{pageNumbers.map((page) => (
							<button
								type="button"
								key={page}
								onClick={() => onSelectPage(page)}
								className={cn(
									"flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition hover:bg-accent",
									page === currentPage && "ring-2 ring-ring",
								)}
							>
								<div className="aspect-[16/9] overflow-hidden rounded-md border border-border bg-muted p-2">
									<PdfCanvas
										pdfProxy={pdfProxy}
										pageNumber={page}
										className="h-full w-full"
									/>
								</div>
								<div className="text-xs text-muted-foreground">
									Slide {page}
								</div>
							</button>
						))}
					</div>
				</Suspense>
			</div>
		</div>
	);
});
