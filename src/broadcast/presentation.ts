import { useEffect, useEffectEvent } from "react";
import { getBroadcastChannel } from "./channel";
import type {
	BroadcastAction,
	PresentationAction,
	PresenterAction,
} from "./types";

declare global {
	interface PresenterCommandMap {
		"send-current-page-number": {
			pageNumber: number;
		};
		"send-blackout-state": {
			isBlackout: boolean;
		};
	}
}

export function usePresentationBroadcast(
	fileName: string,
	pairId: string,
	{
		onPageNumberChange,
		onBlackoutChange,
	}: {
		onPageNumberChange: (pageNumber: number) => void;
		onBlackoutChange: (isBlackout: boolean) => void;
	},
) {
	const handleMessage = useEffectEvent((action: PresenterAction) => {
		switch (action.command) {
			case "send-current-page-number":
				onPageNumberChange(action.pageNumber);
				break;
			case "send-blackout-state":
				onBlackoutChange?.(action.isBlackout);
				break;
		}
	});

	useEffect(() => {
		const channel = getBroadcastChannel(fileName, pairId);
		const abortController = new AbortController();
		channel.addEventListener(
			"message",
			(event) => {
				const action = event.data as BroadcastAction;
				if (action.from === "presenter") handleMessage(action);
			},
			{ signal: abortController.signal },
		);
		channel.postMessage({
			from: "presentation",
			command: "get-blackout-state",
		} satisfies PresentationAction);
		return () => {
			abortController.abort();
		};
	}, [fileName, pairId]);
}
