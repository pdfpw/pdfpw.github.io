import { useEffect, useEffectEvent } from "react";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getBroadcastChannel } from "./channel";
import { getLobbyChannel, replyPairOffer } from "./pairing";
import type { BroadcastAction, PresentationAction } from "./types";

declare global {
	interface PresentationCommandMap {
		"get-config": {};
		"get-pdf": {};
		"get-blackout-state": {};
	}
}

export function usePresenterBroadcast(
	fileName: string,
	pairId: string,
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pdf: File  ,
	isBlackout: boolean,
) {
	const channel = getBroadcastChannel(fileName, pairId);
	const handleMessage = useEffectEvent(async (action: PresentationAction) => {
		switch (action.command) {
			case "get-config":
				channel.postMessage({
					from: "presenter",
					command: "get-config-response",
					pdfpcConfig,
				} satisfies BroadcastAction);
				break;
			case "get-pdf": {
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
				channel.postMessage({
					from: "presenter",
					command: "send-blackout-state",
					isBlackout,
				} satisfies BroadcastAction);
				break;
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		channel.addEventListener(
			"message",
			(event) => {
				const action = event.data as BroadcastAction;
				if (action.from === "presentation") handleMessage(action);
			},
			{ signal: abortController.signal },
		);
		return () => {
			abortController.abort();
		};
	}, [channel]);

	useEffect(() => {
		const lobby = getLobbyChannel(fileName);
		const abortController = new AbortController();
		lobby.addEventListener(
			"message",
			(event) => {
				const message = event.data as { kind?: string; requestId?: string };
				if (message.kind !== "pair-request" || !message.requestId) return;
				replyPairOffer(fileName, pairId, message.requestId);
			},
			{ signal: abortController.signal },
		);
		return () => {
			abortController.abort();
			lobby.close();
		};
	}, [fileName, pairId]);
}
