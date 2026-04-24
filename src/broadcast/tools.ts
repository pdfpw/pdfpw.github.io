import { useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";
import type { EmptyObject } from "type-fest";
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

interface ToolCommandMap {
	"tool-mode": { mode: ToolMode };
	"pointer-move": { x: number; y: number };
	"pointer-leave": EmptyObject;
	"pen-stroke-start": { strokeId: string; x: number; y: number };
	"pen-stroke-point": { strokeId: string; x: number; y: number };
	"pen-stroke-end": { strokeId: string };
	"pen-clear": EmptyObject;
}

declare global {
	interface PresenterCommandMap extends ToolCommandMap {}
	interface PresentationCommandMap extends ToolCommandMap {}
}

const TOOL_COMMAND_NAMES = new Set<string>([
	"tool-mode",
	"pointer-move",
	"pointer-leave",
	"pen-stroke-start",
	"pen-stroke-point",
	"pen-stroke-end",
	"pen-clear",
]);

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
	if (from === "presenter") {
		channel.postMessage({ from, ...cmd } satisfies PresenterAction);
	} else {
		channel.postMessage({ from, ...cmd } satisfies PresentationAction);
	}
}

export type ToolAction = Extract<
	PresenterAction | PresentationAction,
	{ command: keyof ToolCommandMap }
>;

/**
 * ツール系コマンドを受信して pointer-state atoms を更新する。
 * BroadcastChannel の仕様により自身が送信したメッセージは届かないが、
 * 念のため selfSide チェックで二重防御する。
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
			if (TOOL_COMMAND_NAMES.has(action.command)) {
				onAction(action as ToolAction);
			}
		};
		channel.addEventListener("message", listener, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, [fileName, pairId, selfSide]);
}
