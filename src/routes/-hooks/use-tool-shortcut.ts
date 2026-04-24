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

		if (event.key === "Escape") {
			if (toolMode !== "none") {
				event.preventDefault();
				changeMode("none");
			}
			return;
		}

		switch (event.key.toLowerCase()) {
			case "l":
				event.preventDefault();
				changeMode(toolMode === "laser" ? "none" : "laser");
				break;
			case "d":
				event.preventDefault();
				changeMode(toolMode === "pen" ? "none" : "pen");
				break;
			case "e":
				event.preventDefault();
				clearPen();
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
