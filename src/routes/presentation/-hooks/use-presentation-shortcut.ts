import { useEffect, useEffectEvent } from "react";
import { sendNavigate } from "#src/broadcast";

export function usePresentationShortcut(fileName: string, pairId: string) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		switch (event.key) {
			case " ":
			case "ArrowRight":
			case "PageDown":
				event.preventDefault();
				sendNavigate(fileName, pairId, "next");
				break;
			case "ArrowLeft":
			case "PageUp":
				event.preventDefault();
				sendNavigate(fileName, pairId, "prev");
				break;
			case "Home":
				event.preventDefault();
				sendNavigate(fileName, pairId, "home");
				break;
			case "End":
				event.preventDefault();
				sendNavigate(fileName, pairId, "end");
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
