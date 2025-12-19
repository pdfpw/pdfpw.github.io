import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import {
	type HTMLAttributes,
	memo,
	use,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "#src/lib/utils";

export const PdfCanvas = memo(function PdfCanvas({
	pdfProxy,
	pageNumber,
	className,
	...props
}: Omit<HTMLAttributes<HTMLDivElement>, "ref"> & {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
}) {
	const page = use(pdfProxy.getPage(pageNumber));
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [viewport, setViewport] = useState<PageViewport | null>(null);
	const lastViewportRef = useRef<{
		width: number;
		height: number;
		scale: number;
	} | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const baseViewport = page.getViewport({ scale: 1 });

		const updateScale = () => {
			const { width, height } = container.getBoundingClientRect();
			if (width <= 0 || height <= 0) return;
			const scale = Math.min(
				width / baseViewport.width,
				height / baseViewport.height,
			);
			const nextScale = Math.max(scale, 0.1);
			const nextViewport = page.getViewport({ scale: nextScale });
			const last = lastViewportRef.current;
			if (
				last &&
				Math.abs(last.scale - nextScale) < 0.001 &&
				Math.abs(last.width - nextViewport.width) < 0.5 &&
				Math.abs(last.height - nextViewport.height) < 0.5
			) {
				return;
			}
			lastViewportRef.current = {
				width: nextViewport.width,
				height: nextViewport.height,
				scale: nextScale,
			};
			setViewport(nextViewport);
		};

		updateScale();
		const observer = new ResizeObserver(updateScale);
		observer.observe(container);
		return () => observer.disconnect();
	}, [page]);

	useEffect(() => {
		if (!viewport) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const context = canvas.getContext("2d");
		if (!context) return;

		const outputScale = window.devicePixelRatio || 1;
		const scaledViewport = page.getViewport({
			scale: viewport.scale * outputScale,
		});
		canvas.width = Math.floor(scaledViewport.width);
		canvas.height = Math.floor(scaledViewport.height);
		canvas.style.width = `${Math.floor(viewport.width)}px`;
		canvas.style.height = `${Math.floor(viewport.height)}px`;

		const renderTask = page.render({
			canvas,
			canvasContext: context,
			viewport: scaledViewport,
		});

		return () => {
			renderTask.cancel();
		};
	}, [page, viewport]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"flex h-full w-full items-center justify-center",
				className,
			)}
			{...props}
		>
			<canvas ref={canvasRef} className="block max-h-full max-w-full" />
		</div>
	);
});
