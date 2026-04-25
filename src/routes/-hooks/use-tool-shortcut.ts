import { useAtom, useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";
import { sendTool, type ToolSide } from "#src/broadcast";
import { matchAction } from "#src/lib/keybindings.ts";
import {
	clearPenStrokes,
	laserPosAtom,
	type ToolMode,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";

export function useToolShortcut(
	fileName: string,
	pairId: string,
	selfSide: ToolSide,
): void {
	const [toolMode, setToolMode] = useAtom(toolModeAtom);
	const doClearStrokes = useSetAtom(clearPenStrokes);
	const setLaserPos = useSetAtom(laserPosAtom);

	const changeMode = useEffectEvent((next: ToolMode) => {
		setLaserPos(null);
		setToolMode(next);
		sendTool(fileName, pairId, selfSide, { command: "tool-mode", mode: next });
	});

	const clearPen = useEffectEvent(() => {
		doClearStrokes();
		sendTool(fileName, pairId, selfSide, { command: "pen-clear" });
	});

	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		const target = event.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable)
		) {
			return;
		}

		const action = matchAction(event, selfSide);
		if (!action) return;

		switch (action) {
			case "tool.exit":
				if (toolMode !== "none") {
					event.preventDefault();
					changeMode("none");
				}
				// tool モードでない時は Esc を消費しない (overview 等が処理できるように)
				break;
			case "tool.laser":
				event.preventDefault();
				changeMode(toolMode === "laser" ? "none" : "laser");
				break;
			case "tool.pen":
				event.preventDefault();
				changeMode(toolMode === "pen" ? "none" : "pen");
				break;
			case "tool.erase":
				event.preventDefault();
				clearPen();
				break;
			default:
				break;
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		window.addEventListener("keydown", onKeyDown, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, []);
}
