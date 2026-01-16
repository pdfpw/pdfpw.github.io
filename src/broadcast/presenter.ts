import { useEffect, useEffectEvent } from "react";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getBroadcastChannel } from "./channel";
import { getLobbyChannel, replyPairOffer } from "./pairing";
import type { BroadcastAction, PresentationAction } from "./types";

declare global {
	interface PresentationCommandMap {
		initialize: Record<string, never>;
		"get-config": Record<string, never>;
		"get-pdf": Record<string, never>;
		"get-blackout-state": Record<string, never>;
		"get-current-page-number": Record<string, never>;
	}
}

export function usePresenterBroadcast(
	fileName: string,
	pairId: string,
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pdf: File,
	isBlackout: boolean,
	pageNumber: number,
) {
	const channel = getBroadcastChannel(fileName, pairId);
	const handleMessage = useEffectEvent(async (action: PresentationAction) => {
		console.log("[Presenter Broadcast] Received:", action);
		switch (action.command) {
			case "initialize": {
				console.log("[Presenter Broadcast] Initializing presentation window");
				// Send all initialization data together
				const buffer = await pdf.arrayBuffer();
				channel.postMessage({
					from: "presenter",
					command: "initialize-response",
					pdfpcConfig,
					pdfData: buffer,
					pageNumber,
					isBlackout,
				} satisfies BroadcastAction);
				break;
			}
			case "get-config":
				console.log("[Presenter Broadcast] Sending config");
				channel.postMessage({
					from: "presenter",
					command: "get-config-response",
					pdfpcConfig,
				} satisfies BroadcastAction);
				break;
			case "get-pdf":
				{
					console.log("[Presenter Broadcast] Sending PDF");
					const channel = getBroadcastChannel(fileName, pairId);
					const buffer = await pdf.arrayBuffer();
					channel.postMessage({
						from: "presenter",
						command: "get-pdf-response",
						pdfData: buffer,
					} satisfies BroadcastAction);
				}
				break;
			case "get-blackout-state":
				console.log(
					"[Presenter Broadcast] Sending blackout state:",
					isBlackout,
				);
				channel.postMessage({
					from: "presenter",
					command: "send-blackout-state",
					isBlackout,
				} satisfies BroadcastAction);
				break;
			case "get-current-page-number":
				console.log(
					"[Presenter Broadcast] Sending current page number:",
					pageNumber,
				);
				channel.postMessage({
					from: "presenter",
					command: "get-current-page-number-response",
					pageNumber,
				} satisfies BroadcastAction);
				break;
		}
	});

	const onMessage = useEffectEvent((event: MessageEvent) => {
		const action = event.data as BroadcastAction;
		if (action.from === "presentation") handleMessage(action);
	});

	useEffect(() => {
		const abortController = new AbortController();
		channel.addEventListener("message", onMessage, {
			signal: abortController.signal,
		});
		return () => {
			abortController.abort();
		};
	}, [channel]);

	const handleLobbyMessage = useEffectEvent((event: MessageEvent) => {
		const message = event.data as { kind?: string; requestId?: string };
		if (message.kind !== "pair-request" || !message.requestId) return;
		replyPairOffer(fileName, pairId, message.requestId);
	});

	useEffect(() => {
		const lobby = getLobbyChannel(fileName);
		const abortController = new AbortController();
		lobby.addEventListener("message", handleLobbyMessage, {
			signal: abortController.signal,
		});
		return () => {
			abortController.abort();
			lobby.close();
		};
	}, [fileName]);
}
