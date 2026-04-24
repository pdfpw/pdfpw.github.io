import type { ToolMode } from "#src/lib/pointer-state.ts";
import { getBroadcastChannel } from "./channel";
import type { PresentationAction, PresenterAction } from "./types";

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
