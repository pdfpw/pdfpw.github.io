import { useAtom, useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";
import { sendTool, type ToolSide } from "#src/broadcast";
import {
	clearPenStrokes,
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

	const changeMode = useEffectEvent((next: ToolMode) => {
		setToolMode(next);
		sendTool(fileName, pairId, selfSide, { command: "tool-mode", mode: next });
	});

	const clearPen = useEffectEvent(() => {
		doClearStrokes();
		sendTool(fileName, pairId, selfSide, { command: "pen-clear" });
	});

	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		// IME やテキスト入力中は無視
		const target = event.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable)
		) {
			return;
		}

		switch (event.key) {
			case "l":
			case "L":
				event.preventDefault();
				changeMode(toolMode === "laser" ? "none" : "laser");
				break;
			case "d":
			case "D":
				event.preventDefault();
				changeMode(toolMode === "pen" ? "none" : "pen");
				break;
			case "e":
			case "E":
				event.preventDefault();
				clearPen();
				break;
			case "Escape":
				if (toolMode !== "none") {
					event.preventDefault();
					changeMode("none");
				}
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
