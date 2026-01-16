import { useEffect, useEffectEvent } from "react";
import { getBroadcastChannel } from "./channel";
import type {
	BroadcastAction,
	PresentationAction,
	PresenterAction,
} from "./types";

declare global {
	interface PresenterCommandMap {
		"initialize-response": {
			pdfpcConfig: import("#src/lib/pdfpc-config").ResolvedPdfpcConfigV2;
			pdfData: ArrayBuffer;
			pageNumber: number;
			isBlackout: boolean;
		};
		"send-current-page-number": {
			pageNumber: number;
		};
		"send-blackout-state": {
			isBlackout: boolean;
		};
		"get-current-page-number-response": {
			pageNumber: number;
		};
	}
}

export function usePresentationBroadcast(
	fileName: string,
	pairId: string,
	{
		onPageNumberChange,
		onBlackoutChange,
		onInitialize,
	}: {
		onPageNumberChange: (pageNumber: number) => void;
		onBlackoutChange: (isBlackout: boolean) => void;
		onInitialize?: (data: {
			pdfpcConfig: import("#src/lib/pdfpc-config").ResolvedPdfpcConfigV2;
			pdfData: ArrayBuffer;
			pageNumber: number;
			isBlackout: boolean;
		}) => void;
	},
) {
	const handleMessage = useEffectEvent((action: PresenterAction) => {
		console.log("[Presentation Broadcast] Received:", action);
		switch (action.command) {
			case "initialize-response":
				console.log("[Presentation Broadcast] Initialize response received");
				onInitialize?.(action);
				onPageNumberChange(action.pageNumber);
				onBlackoutChange?.(action.isBlackout);
				break;
			case "send-current-page-number":
				console.log("[Presentation Broadcast] Page number change:", action.pageNumber);
				onPageNumberChange(action.pageNumber);
				break;
			case "send-blackout-state":
				console.log("[Presentation Broadcast] Blackout state change:", action.isBlackout);
				onBlackoutChange?.(action.isBlackout);
				break;
			case "get-current-page-number-response":
				console.log("[Presentation Broadcast] Page number response:", action.pageNumber);
				onPageNumberChange(action.pageNumber);
				break;
		}
	});

	useEffect(() => {
		const channel = getBroadcastChannel(fileName, pairId);
		const abortController = new AbortController();
		let initialized = false;

		const sendInitialize = () => {
			if (initialized || abortController.signal.aborted) return;
			console.log("[Presentation Broadcast] Requesting initialization");
			channel.postMessage({
				from: "presentation",
				command: "initialize",
			} satisfies PresentationAction);
		};

		channel.addEventListener(
			"message",
			(event) => {
				const action = event.data as BroadcastAction;
				if (action.from === "presenter") {
					if (action.command === "initialize-response") {
						initialized = true;
					}
					handleMessage(action);
				}
			},
			{ signal: abortController.signal },
		);

		// Retry logic for initialization
		const retryDelaysMs = [0, 200, 500, 1000, 1500, 2000, 3000];
		let attempts = 0;

		const scheduleRetry = () => {
			if (initialized || abortController.signal.aborted) return;
			const delay =
				retryDelaysMs[Math.min(attempts, retryDelaysMs.length - 1)];
			const timer = setTimeout(() => {
				if (initialized || abortController.signal.aborted) return;
				attempts++;
				sendInitialize();
				if (attempts < retryDelaysMs.length) {
					scheduleRetry();
				}
			}, delay);
			abortController.signal.addEventListener("abort", () => clearTimeout(timer));
		};

		sendInitialize();
		scheduleRetry();

		return () => {
			abortController.abort();
		};
	}, [fileName, pairId]);
}
