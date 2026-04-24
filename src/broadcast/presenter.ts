import { useEffect, useEffectEvent } from "react";
import type { EmptyObject } from "type-fest";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getBroadcastChannel } from "./channel";
import { getLobbyChannel, replyPairOffer } from "./pairing";
import type { BroadcastAction, PresentationAction } from "./types";

declare global {
	interface PresentationCommandMap {
		initialize: EmptyObject;
		"get-config": EmptyObject;
		"get-pdf": EmptyObject;
		"get-blackout-state": EmptyObject;
		"get-current-page-number": EmptyObject;
		navigate: {
			direction: "next" | "prev" | "home" | "end";
		};
	}
}

export function usePresenterBroadcast(
	fileName: string,
	pairId: string,
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pdf: File,
	isBlackout: boolean,
	pageNumber: number,
	onNavigate?: (direction: "next" | "prev" | "home" | "end") => void,
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
			case "navigate":
				console.log("[Presenter Broadcast] Navigate:", action.direction);
				onNavigate?.(action.direction);
				break;
		}
	});

	const onMessage = useEffectEvent((event: MessageEvent) => {
		const action = event.data as BroadcastAction;
		if (action.from === "presentation") handleMessage(action);
	});

	useEffect(() => {
		const abortController = new AbortController();
		getBroadcastChannel(fileName, pairId).addEventListener(
			"message",
			onMessage,
			{
				signal: abortController.signal,
			},
		);
		return () => {
			abortController.abort();
		};
	}, [fileName, pairId]);

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
