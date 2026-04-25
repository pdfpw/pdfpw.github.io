import { useEffect, useEffectEvent } from "react";
import { matchAction } from "#src/lib/keybindings.ts";

interface Callbacks {
	toggleFullscreen: () => void;
	toggleOverview: () => void;
	closeOverviewIfOpen: () => boolean;
}

export function usePresentationViewShortcut(callbacks: Callbacks) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		// Esc は overview 開閉中なら閉じる (action としては tool.exit と衝突するので
		// matchAction の前に context 判定で先取りする)
		if (event.key === "Escape") {
			if (callbacks.closeOverviewIfOpen()) {
				event.preventDefault();
			}
			return;
		}

		const action = matchAction(event, "presentation");
		if (!action) return;

		switch (action) {
			case "view.fullscreen":
				event.preventDefault();
				callbacks.toggleFullscreen();
				break;
			case "view.overview":
				event.preventDefault();
				callbacks.toggleOverview();
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
