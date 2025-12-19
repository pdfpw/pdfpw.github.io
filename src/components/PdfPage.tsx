import type { ClassValue } from "clsx";
import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import {
	type HTMLAttributes,
	memo,
	type RefObject,
	Suspense,
	use,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "#src/lib/utils";
import { Skeleton } from "./ui/skeleton";

interface PdfPageProps
	extends Omit<HTMLAttributes<HTMLDivElement>, "ref" | "className"> {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	className?: ClassValue;
}

export function PdfPage({ className, ...props }: PdfPageProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	return (
		<div
			data-slot="pdf-page-container"
			className={cn(
				"flex h-full w-full items-center justify-center",
				className,
			)}
			ref={containerRef}
			{...props}
		>
			<Suspense
				fallback={<Skeleton className="block max-h-full max-w-full"></Skeleton>}
			>
				<PdfPageCanvas {...props} />
			</Suspense>
		</div>
	);
}

function PdfPageCanvas({
	pdfProxy,
	pageNumber,
	containerRef,
}: {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	containerRef: RefObject<HTMLDivElement | null>;
}) {
	const page = use(pdfProxy.getPage(pageNumber));
	const { baseViewport } = useMemo(
		() => ({
			baseViewport: page.getViewport({ scale: 1 }),
		}),
		[page],
	);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [viewport, setViewport] = useState<PageViewport | null>(null);
	const lastViewportRef = useRef<{
		width: number;
		height: number;
		scale: number;
	} | null>(null);

	const a = useEffectEvent<ResizeObserverCallback>((entries) => {
		const divElement = entries.find(
			(e) =>
				e.target.attributes.getNamedItem("data-slot")?.value ===
				"pdf-page-container",
		);
		if (!divElement) return;

		const { width, height } = divElement.contentRect;
		if (width <= 0 || height <= 0) return;

		const scale = Math.min(
			width / baseViewport.width,
			height / baseViewport.height,
		);
		const nextScale = Math.max(0.1);
		const nextViewport = page.getViewport({ scale: nextScale });
		const last = lastViewportRef.current;
		if (
			last &&
			Math.abs(last.scale - nextScale) < 0.001 &&
			Math.abs(last.width - nextViewport.width) < 0.5 &&
			Math.abs(last.height - nextViewport.height) < 0.5
		)
			return;

		lastViewportRef.current = {
			width: nextViewport.width,
			height: nextViewport.height,
			scale: nextScale,
		};
		setViewport(nextViewport);
	});

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

	return <canvas ref={canvasRef} className="block max-h-full max-w-full" />;
}
