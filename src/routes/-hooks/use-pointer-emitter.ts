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

interface Point {
	x: number;
	y: number;
}

function normalizedPointer(
	clientX: number,
	clientY: number,
	rect: DOMRect,
): Point | null {
	if (rect.width === 0 || rect.height === 0) return null;
	return {
		x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
		y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
	};
}

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
	const pendingLaserRef = useRef<Point | null>(null);
	const pendingPenPointsRef = useRef<Point[]>([]);
	const rafHandleRef = useRef<number | null>(null);

	const flushPending = useEffectEvent(() => {
		rafHandleRef.current = null;

		if (toolMode === "laser") {
			const p = pendingLaserRef.current;
			if (!p) return;
			pendingLaserRef.current = null;
			setLaserPos(p);
			sendTool(fileName, pairId, selfSide, {
				command: "pointer-move",
				x: p.x,
				y: p.y,
			});
		} else if (toolMode === "pen" && strokeIdRef.current) {
			const pts = pendingPenPointsRef.current;
			if (pts.length === 0) return;
			pendingPenPointsRef.current = [];
			const strokeId = strokeIdRef.current;
			for (const p of pts) {
				doAddPenPoint({ strokeId, x: p.x, y: p.y });
				sendTool(fileName, pairId, selfSide, {
					command: "pen-stroke-point",
					strokeId,
					x: p.x,
					y: p.y,
				});
			}
		}
	});

	const handleMove = useEffectEvent((event: PointerEvent) => {
		// ペンモード中、未 down の間は何もしない
		if (toolMode === "pen" && !strokeIdRef.current) return;
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();

		// サブフレームのイベントまで拾ってペンストロークを滑らかに/レーザーは最新位置を採用
		const coalesced = event.getCoalescedEvents?.() ?? [];
		const samples = coalesced.length > 0 ? coalesced : [event];

		if (toolMode === "laser") {
			const latest = samples[samples.length - 1];
			const p = normalizedPointer(latest.clientX, latest.clientY, rect);
			if (p) pendingLaserRef.current = p;
		} else if (toolMode === "pen") {
			for (const e of samples) {
				const p = normalizedPointer(e.clientX, e.clientY, rect);
				if (p) pendingPenPointsRef.current.push(p);
			}
		}

		if (rafHandleRef.current !== null) return;
		rafHandleRef.current = requestAnimationFrame(flushPending);
	});

	const handleLeave = useEffectEvent(() => {
		pendingLaserRef.current = null;
		if (toolMode === "laser") {
			setLaserPos(null);
			sendTool(fileName, pairId, selfSide, { command: "pointer-leave" });
		}
	});

	const handleDown = useEffectEvent((event: PointerEvent) => {
		if (toolMode !== "pen") return;
		if (event.button !== 0) return;
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const point = normalizedPointer(event.clientX, event.clientY, rect);
		if (!point) return;
		event.preventDefault();
		const strokeId = crypto.randomUUID();
		strokeIdRef.current = strokeId;
		doAddPenStroke({ strokeId, x: point.x, y: point.y });
		sendTool(fileName, pairId, selfSide, {
			command: "pen-stroke-start",
			strokeId,
			x: point.x,
			y: point.y,
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
		const signal = abortController.signal;

		el.addEventListener("pointermove", handleMove, { signal });
		el.addEventListener("pointerleave", handleLeave, { signal });
		el.addEventListener("pointerdown", handleDown, { signal });
		el.addEventListener("pointerup", handleUp, { signal });
		el.addEventListener("pointercancel", handleUp, { signal });

		return () => {
			abortController.abort();
			if (rafHandleRef.current !== null) {
				cancelAnimationFrame(rafHandleRef.current);
				rafHandleRef.current = null;
			}
		};
	}, [containerRef, toolMode]);
}
