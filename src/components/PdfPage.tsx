import type { ClassValue } from "clsx";
import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import {
	type HTMLAttributes,
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
	pdfProxyPromise: Promise<PDFDocumentProxy>;
	pageNumber: number;
	className?: ClassValue;
}

export function PdfPage({
	pdfProxyPromise,
	pageNumber,
	className,
	...props
}: PdfPageProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	return (
		<div
			data-slot="pdf-page-container"
			className={cn(
				"flex h-full w-full items-center justify-center overflow-hidden",
				className,
			)}
			ref={containerRef}
			{...props}
		>
			<Suspense
				fallback={<Skeleton className="block h-full w-full"></Skeleton>}
			>
				<PdfPageCanvas
					pdfProxyPromise={pdfProxyPromise}
					pageNumber={pageNumber}
					containerRef={containerRef}
				/>
			</Suspense>
		</div>
	);
}

function PdfPageCanvas({
	pdfProxyPromise,
	pageNumber,
	containerRef,
}: {
	pdfProxyPromise: Promise<PDFDocumentProxy>;
	pageNumber: number;
	containerRef: RefObject<HTMLDivElement | null>;
}) {
	const pdfProxy = use(pdfProxyPromise);
	const { page, baseViewport } = use(
		useMemo(async () => {
			const page = await pdfProxy.getPage(pageNumber);
			return {
				page,
				baseViewport: page.getViewport({ scale: 1 }),
			};
		}, [pdfProxy, pageNumber]),
	);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [viewport, setViewport] = useState<PageViewport | null>(null);
	const lastViewportRef = useRef<{
		width: number;
		height: number;
		scale: number;
	} | null>(null);

	const updateScale = useEffectEvent(((
		entries: Pick<ResizeObserverEntry, "target" | "contentRect">[],
	) => {
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
		const nextScale = Math.max(0.1, scale);
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
	}) satisfies ResizeObserverCallback);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		updateScale([
			{
				target: container,
				contentRect: getContentBoxSize(container),
			},
		]);
		const observer = new ResizeObserver(updateScale);
		observer.observe(container);
		return () => observer.disconnect();
	}, [containerRef.current]);

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
function getContentBoxSize(el: HTMLElement): DOMRectReadOnly {
	const style = window.getComputedStyle(el);
	const paddingX = Number(style.paddingLeft) + Number(style.paddingRight);
	const paddingY = Number(style.paddingTop) + Number(style.paddingBottom);

	// clientWidth/Height は border は含まず、padding は含みます
	const width = Math.max(0, el.clientWidth - paddingX);
	const height = Math.max(0, el.clientHeight - paddingY);

	return { width, height } as DOMRectReadOnly;
}
