import { useAtomValue, useSetAtom } from "jotai";
import { type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { sendTool, type ToolSide } from "#src/broadcast";
import {
	addPenPoint,
	addPenStroke,
	endPenStroke,
	laserPosAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";

/**
 * 指定要素内でのマウス移動/クリックを観察し、tool-mode に応じて
 * ローカルの pointer-state を更新 + broadcast する。
 * - laser: pointermove で座標を更新/送信
 * - pen: pointerdown で新規ストローク、drag 中 pointermove で点追加、pointerup で終了
 */
export function usePointerEmitter(
	containerRef: RefObject<HTMLElement | null>,
	fileName: string,
	pairId: string,
	selfSide: ToolSide,
): void {
	const toolMode = useAtomValue(toolModeAtom);
	const setLaserPos = useSetAtom(laserPosAtom);
	const doAddPenStroke = useSetAtom(addPenStroke);
	const doAddPenPoint = useSetAtom(addPenPoint);
	const doEndPenStroke = useSetAtom(endPenStroke);

	const strokeIdRef = useRef<string | null>(null);
	const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
	const rafHandleRef = useRef<number | null>(null);

	// useEffectEvent: 最新の toolMode/atoms/props を参照しつつ安定参照を保つ
	const flushPendingPoint = useEffectEvent(() => {
		rafHandleRef.current = null;
		const p = pendingPointRef.current;
		if (!p) return;
		pendingPointRef.current = null;

		if (toolMode === "laser") {
			setLaserPos(p);
			sendTool(fileName, pairId, selfSide, {
				command: "pointer-move",
				x: p.x,
				y: p.y,
			});
		} else if (toolMode === "pen" && strokeIdRef.current) {
			doAddPenPoint({ strokeId: strokeIdRef.current, x: p.x, y: p.y });
			sendTool(fileName, pairId, selfSide, {
				command: "pen-stroke-point",
				strokeId: strokeIdRef.current,
				x: p.x,
				y: p.y,
			});
		}
	});

	const schedule = useEffectEvent((p: { x: number; y: number }) => {
		pendingPointRef.current = p;
		if (rafHandleRef.current !== null) return;
		rafHandleRef.current = requestAnimationFrame(flushPendingPoint);
	});

	const handleLeave = useEffectEvent(() => {
		pendingPointRef.current = null;
		if (toolMode === "laser") {
			setLaserPos(null);
			sendTool(fileName, pairId, selfSide, { command: "pointer-leave" });
		}
	});

	const handleDown = useEffectEvent((event: PointerEvent, el: HTMLElement) => {
		if (toolMode !== "pen") return;
		if (event.button !== 0) return;
		event.preventDefault();
		const rect = el.getBoundingClientRect();
		const x = Math.max(
			0,
			Math.min(1, (event.clientX - rect.left) / rect.width),
		);
		const y = Math.max(
			0,
			Math.min(1, (event.clientY - rect.top) / rect.height),
		);
		const strokeId =
			typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `stroke-${Date.now()}-${Math.random()}`;
		strokeIdRef.current = strokeId;
		doAddPenStroke({ strokeId, x, y });
		sendTool(fileName, pairId, selfSide, {
			command: "pen-stroke-start",
			strokeId,
			x,
			y,
		});
		(event.target as Element).setPointerCapture?.(event.pointerId);
	});

	const handleUp = useEffectEvent((event: PointerEvent) => {
		if (!strokeIdRef.current) return;
		const strokeId = strokeIdRef.current;
		strokeIdRef.current = null;
		doEndPenStroke({ strokeId });
		sendTool(fileName, pairId, selfSide, {
			command: "pen-stroke-end",
			strokeId,
		});
		(event.target as Element).releasePointerCapture?.(event.pointerId);
	});

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		if (toolMode === "none") return;

		const abortController = new AbortController();

		const toNormalized = (event: PointerEvent): { x: number; y: number } => {
			const rect = el.getBoundingClientRect();
			const x = (event.clientX - rect.left) / rect.width;
			const y = (event.clientY - rect.top) / rect.height;
			return {
				x: Math.max(0, Math.min(1, x)),
				y: Math.max(0, Math.min(1, y)),
			};
		};

		el.addEventListener(
			"pointermove",
			(event: PointerEvent) => schedule(toNormalized(event)),
			{ signal: abortController.signal },
		);
		el.addEventListener("pointerleave", () => handleLeave(), {
			signal: abortController.signal,
		});
		el.addEventListener(
			"pointerdown",
			(event: PointerEvent) => handleDown(event, el),
			{
				signal: abortController.signal,
			},
		);
		el.addEventListener("pointerup", (event: PointerEvent) => handleUp(event), {
			signal: abortController.signal,
		});
		el.addEventListener(
			"pointercancel",
			(event: PointerEvent) => handleUp(event),
			{
				signal: abortController.signal,
			},
		);

		return () => {
			abortController.abort();
			if (rafHandleRef.current !== null) {
				cancelAnimationFrame(rafHandleRef.current);
				rafHandleRef.current = null;
			}
		};
	}, [containerRef, toolMode]);
}
