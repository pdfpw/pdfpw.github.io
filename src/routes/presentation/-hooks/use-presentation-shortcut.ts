import { useEffect, useEffectEvent } from "react";
import { sendNavigate } from "#src/broadcast";
import { matchAction } from "#src/lib/keybindings.ts";

export function usePresentationShortcut(fileName: string, pairId: string) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		const action = matchAction(event, "presentation");
		if (!action) return;

		switch (action) {
			case "slide.next":
				event.preventDefault();
				sendNavigate(fileName, pairId, "next");
				break;
			case "slide.prev":
				event.preventDefault();
				sendNavigate(fileName, pairId, "prev");
				break;
			case "slide.first":
				event.preventDefault();
				sendNavigate(fileName, pairId, "home");
				break;
			case "slide.last":
				event.preventDefault();
				sendNavigate(fileName, pairId, "end");
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
