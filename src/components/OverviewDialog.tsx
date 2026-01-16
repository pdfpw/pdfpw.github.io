import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef } from "react";
import { OverviewThumbnail } from "#src/components/OverviewThumbnail";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { cn } from "#src/lib/utils";

interface OverviewDialogProps {
	pdfProxy: PDFDocumentProxy;
	pdfpcConfig: ResolvedPdfpcConfigV2;
	currentSlide: number;
	open: boolean;
	onClose: () => void;
	onSlideSelect: (slideNumber: number) => void;
}

export function OverviewDialog({
	pdfProxy,
	pdfpcConfig,
	currentSlide,
	open,
	onClose,
	onSlideSelect,
}: OverviewDialogProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// Escキーでダイアログを閉じる
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		},
		[onClose],
	);

	useEffect(() => {
		if (!open) return;
		const container = containerRef.current;
		if (!container) return;

		container.addEventListener("keydown", handleKeyDown);
		return () => {
			container.removeEventListener("keydown", handleKeyDown);
		};
	}, [open, handleKeyDown]);

	// 全スライドをフラットなリストとして取得
	const allSlides = pdfpcConfig.pages.flat();

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onClose}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					className={cn(
						"fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
						"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					)}
				/>
				<DialogPrimitive.Content
					className={cn(
						"fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:max-w-5xl sm:max-h-[80vh]",
						"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"rounded-xl",
					)}
				>
					<div className="flex items-center justify-between border-b pb-4 mb-4">
						<DialogPrimitive.Title className="text-lg font-semibold">
							スライド一覧 ({pdfpcConfig.totalOverlays} 枚)
						</DialogPrimitive.Title>
						<DialogPrimitive.Close
							className={cn(
								"rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
								"absolute right-4 top-4",
							)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>閉じる</title>
								<path d="M18 6 6 18" />
								<path d="M6 6l12 12" />
							</svg>
							<span className="sr-only">閉じる</span>
						</DialogPrimitive.Close>
					</div>

					<div
						ref={containerRef}
						className="overflow-y-auto max-h-[calc(80vh-140px)]"
					>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
							{allSlides.map((slide) => (
								<OverviewThumbnail
									key={slide.pageNumber}
									pdfProxy={pdfProxy}
									pageNumber={slide.pageNumber}
									isSelected={slide.pageNumber === currentSlide}
									onSelect={() => onSlideSelect(slide.pageNumber)}
									label={slide.label}
								/>
							))}
						</div>
					</div>

					<div className="border-t pt-4 mt-4 text-sm text-muted-foreground">
						Tabキー: 表示/非表示 | Escキー: 閉じる | クリック: スライドを選択
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
