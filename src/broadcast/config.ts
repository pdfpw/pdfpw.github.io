import { use } from "react";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { getBroadcastChannel } from "./channel";
import type { BroadcastAction, PresentationAction } from "./types";

declare global {
	interface PresenterCommandMap {
		"get-config-response": {
			pdfpcConfig: ResolvedPdfpcConfigV2;
		};
	}
}

let configCache: {
	fileName: string;
	pairId: string;
	config: Promise<ResolvedPdfpcConfigV2>;
} | null = null;

export function useConfig(fileName: string, pairId: string) {
	if (configCache?.fileName !== fileName || configCache?.pairId !== pairId) {
		configCache = {
			fileName,
			pairId,
			config: new Promise<ResolvedPdfpcConfigV2>((resolve, reject) => {
				const channel = getBroadcastChannel(fileName, pairId);
				channel.postMessage({
					from: "presentation",
					command: "get-config",
				} satisfies PresentationAction);
				const abortController = new AbortController();
				channel.addEventListener(
					"message",
					(event) => {
						const action = event.data as BroadcastAction;
						if (
							action.from === "presenter" &&
							action.command === "get-config-response"
						) {
							resolve(action.pdfpcConfig);
						}
					},
					{ signal: abortController.signal },
				);
				setTimeout(() => {
					abortController.abort();
					reject(new Error("TIMEOUT_LOADING_PDFPC_CONFIG"));
				}, 5000);
			}),
		};
	}
	return use(configCache.config);
}
