import { useAtomValue, useStore } from "jotai";
import { memo, type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	laserPosAtom,
	type PenStroke,
	penStrokesAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";
import { cn } from "#src/lib/utils.ts";

interface PointerOverlayProps {
	className?: string;
	containerRef: RefObject<HTMLElement | null>;
}

const PEN_COLOR = "#ef4444";
// vectorEffect="non-scaling-stroke" は strokeWidth を CSS pixel で解釈するため px 値で指定する
const PEN_WIDTH_PX = 3;

const Stroke = memo(function Stroke({ stroke }: { stroke: PenStroke }) {
	if (stroke.points.length === 0) return null;
	return (
		<polyline
			points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
			fill="none"
			stroke={PEN_COLOR}
			strokeWidth={PEN_WIDTH_PX}
			strokeLinecap="round"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
		/>
	);
});

export function PointerOverlay({
	className,
	containerRef,
}: PointerOverlayProps) {
	const toolMode = useAtomValue(toolModeAtom);
	const strokes = useAtomValue(penStrokesAtom);
	const rect = useContainerRect(containerRef);
	const store = useStore();
	const laserRef = useRef<HTMLDivElement | null>(null);

	// laser モード中はレーザードットが指示点を示すのでネイティブカーソルを消す
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		if (toolMode === "laser") {
			el.style.cursor = "none";
			return () => {
				el.style.cursor = "";
			};
		}
	}, [toolMode, containerRef]);

	// laser 位置は React 再レンダーをバイパスして直接 DOM を更新する (追従性向上)。
	// 操作側 (usePointerEmitter の setLaserPos) と同期受信側 (useToolBroadcast の
	// setLaserPos) 双方が同じ atom を更新するため、この store.sub 経由の DOM 更新に
	// 一本化することで、ローカル操作とブロードキャスト受信の両方が同経路で流れる。
	useEffect(() => {
		const applyPos = () => {
			const el = laserRef.current;
			if (!el) return;
			const pos = store.get(laserPosAtom);
			if (pos === null || store.get(toolModeAtom) !== "laser") {
				el.style.display = "none";
			} else {
				el.style.display = "";
				el.style.left = `${pos.x * 100}%`;
				el.style.top = `${pos.y * 100}%`;
			}
		};
		applyPos();
		const unsubPos = store.sub(laserPosAtom, applyPos);
		const unsubMode = store.sub(toolModeAtom, applyPos);
		return () => {
			unsubPos();
			unsubMode();
		};
	}, [store]);

	if (toolMode === "none" && strokes.length === 0) return null;
	if (!rect) return null;

	// viewport 内の固定レイヤーとして document.body に portal することで、
	// Menu 等の兄弟要素とのスタッキング順に巻き込まれないようにする
	return createPortal(
		<div
			aria-hidden="true"
			className={cn("fixed pointer-events-none z-50", className)}
			style={{
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			}}
		>
			{strokes.length > 0 ? (
				<svg
					className="absolute inset-0 h-full w-full pointer-events-none"
					viewBox="0 0 1 1"
					preserveAspectRatio="none"
					role="presentation"
				>
					{strokes.map((stroke) => (
						<Stroke key={stroke.id} stroke={stroke} />
					))}
				</svg>
			) : null}
			<LaserDot ref={laserRef} />
		</div>,
		document.body,
	);
}

function useContainerRect(ref: RefObject<HTMLElement | null>) {
	const [rect, setRect] = useState<DOMRect | null>(null);
	useEffect(() => {
		// `ref.current` may be null at mount when the target lives behind a
		// Suspense boundary that hasn't resolved yet (e.g. PdfPageCanvas's
		// inner <div ref={pdfAreaRef}> is suspended while getPage() is
		// pending). The previous implementation early-returned in that case
		// and never recovered because `[ref]` deps are stable, leaving rect
		// null forever and PointerOverlay perpetually rendering null.
		// Watch the document for the ref's element to attach instead.
		let cleanup: (() => void) | null = null;

		const setupOn = (el: HTMLElement) => {
			const update = () => setRect(el.getBoundingClientRect());
			update();
			const observer = new ResizeObserver(update);
			observer.observe(el);
			window.addEventListener("resize", update);
			window.addEventListener("scroll", update, true);
			cleanup = () => {
				observer.disconnect();
				window.removeEventListener("resize", update);
				window.removeEventListener("scroll", update, true);
			};
		};

		const initial = ref.current;
		if (initial) {
			setupOn(initial);
			return () => cleanup?.();
		}

		const mo = new MutationObserver(() => {
			const el = ref.current;
			if (el) {
				mo.disconnect();
				setupOn(el);
			}
		});
		mo.observe(document.body, { childList: true, subtree: true });
		return () => {
			mo.disconnect();
			cleanup?.();
		};
	}, [ref]);
	return rect;
}

function LaserDot({ ref }: { ref: RefObject<HTMLDivElement | null> }) {
	// 1 つのラッパー (0x0 の点) を ref で直接更新することで、halo/core の位置を一括で動かす
	return (
		<div
			ref={ref}
			className="absolute"
			style={{ display: "none", width: 0, height: 0 }}
		>
			<div
				className="absolute"
				style={{
					left: 0,
					top: 0,
					width: 32,
					height: 32,
					transform: "translate(-50%, -50%)",
					borderRadius: "9999px",
					background:
						"radial-gradient(circle, rgba(255,120,120,0.6) 0%, rgba(239,68,68,0.45) 35%, rgba(239,68,68,0) 75%)",
					filter: "blur(1px)",
				}}
			/>
			<div
				className="absolute"
				style={{
					left: 0,
					top: 0,
					width: 12,
					height: 12,
					transform: "translate(-50%, -50%)",
					borderRadius: "9999px",
					background:
						"radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,240,240,1) 25%, rgba(239,68,68,1) 70%, rgba(200,30,30,1) 100%)",
					boxShadow:
						"0 0 4px 1px rgba(239,68,68,0.9), 0 0 10px 3px rgba(239,68,68,0.55)",
				}}
			/>
		</div>
	);
}
