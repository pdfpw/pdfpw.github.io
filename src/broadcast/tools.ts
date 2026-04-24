import { useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";
import type { ToolMode } from "#src/lib/pointer-state.ts";
import {
	addPenPoint,
	addPenStroke,
	clearPenStrokes,
	endPenStroke,
	laserPosAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";
import { getBroadcastChannel } from "./channel";
import type {
	BroadcastAction,
	PresentationAction,
	PresenterAction,
} from "./types";

// 双方向コマンド: 両方のマップに宣言することで from 問わず送信可能に
declare global {
	interface PresenterCommandMap {
		"tool-mode": { mode: "none" | "laser" | "pen" };
		"pointer-move": { x: number; y: number };
		"pointer-leave": Record<string, never>;
		"pen-stroke-start": { strokeId: string; x: number; y: number };
		"pen-stroke-point": { strokeId: string; x: number; y: number };
		"pen-stroke-end": { strokeId: string };
		"pen-clear": Record<string, never>;
	}
	interface PresentationCommandMap {
		"tool-mode": { mode: "none" | "laser" | "pen" };
		"pointer-move": { x: number; y: number };
		"pointer-leave": Record<string, never>;
		"pen-stroke-start": { strokeId: string; x: number; y: number };
		"pen-stroke-point": { strokeId: string; x: number; y: number };
		"pen-stroke-end": { strokeId: string };
		"pen-clear": Record<string, never>;
	}
}

export type ToolSide = "presenter" | "presentation";

type ToolCommand =
	| { command: "tool-mode"; mode: ToolMode }
	| { command: "pointer-move"; x: number; y: number }
	| { command: "pointer-leave" }
	| { command: "pen-stroke-start"; strokeId: string; x: number; y: number }
	| { command: "pen-stroke-point"; strokeId: string; x: number; y: number }
	| { command: "pen-stroke-end"; strokeId: string }
	| { command: "pen-clear" };

export function sendTool(
	fileName: string,
	pairId: string,
	from: ToolSide,
	cmd: ToolCommand,
): void {
	const channel = getBroadcastChannel(fileName, pairId);
	// postMessage は any を受け付けるため厳密な satisfies は不要。
	// 型安全性は呼び出し側の引数型 (ToolCommand, ToolSide) で担保される
	channel.postMessage({ from, ...cmd });
}

export type ToolAction = Extract<
	PresenterAction | PresentationAction,
	{
		command:
			| "tool-mode"
			| "pointer-move"
			| "pointer-leave"
			| "pen-stroke-start"
			| "pen-stroke-point"
			| "pen-stroke-end"
			| "pen-clear";
	}
>;

/**
 * ツール系コマンドを受信して pointer-state atoms を更新する。
 * 自身が送信したメッセージは BroadcastChannel の仕様により受信されないため、
 * 送信側は別途 local atom を更新すること。
 */
export function useToolBroadcast(
	fileName: string,
	pairId: string,
	selfSide: ToolSide,
): void {
	const setToolMode = useSetAtom(toolModeAtom);
	const setLaserPos = useSetAtom(laserPosAtom);
	const doAddPenStroke = useSetAtom(addPenStroke);
	const doAddPenPoint = useSetAtom(addPenPoint);
	const doEndPenStroke = useSetAtom(endPenStroke);
	const doClearStrokes = useSetAtom(clearPenStrokes);

	const onAction = useEffectEvent((action: ToolAction) => {
		switch (action.command) {
			case "tool-mode":
				setToolMode(action.mode);
				break;
			case "pointer-move":
				setLaserPos({ x: action.x, y: action.y });
				break;
			case "pointer-leave":
				setLaserPos(null);
				break;
			case "pen-stroke-start":
				doAddPenStroke({
					strokeId: action.strokeId,
					x: action.x,
					y: action.y,
				});
				break;
			case "pen-stroke-point":
				doAddPenPoint({
					strokeId: action.strokeId,
					x: action.x,
					y: action.y,
				});
				break;
			case "pen-stroke-end":
				doEndPenStroke({ strokeId: action.strokeId });
				break;
			case "pen-clear":
				doClearStrokes();
				break;
		}
	});

	useEffect(() => {
		const channel = getBroadcastChannel(fileName, pairId);
		const abortController = new AbortController();
		const listener = (event: MessageEvent) => {
			const action = event.data as BroadcastAction;
			if (action.from === selfSide) return;
			if (
				action.command === "tool-mode" ||
				action.command === "pointer-move" ||
				action.command === "pointer-leave" ||
				action.command === "pen-stroke-start" ||
				action.command === "pen-stroke-point" ||
				action.command === "pen-stroke-end" ||
				action.command === "pen-clear"
			) {
				onAction(action as ToolAction);
			}
		};
		channel.addEventListener("message", listener, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, [fileName, pairId, selfSide]);
}
