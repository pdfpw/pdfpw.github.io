import { getBroadcastChannel } from "./channel";
import type { BroadcastAction, PresentationAction } from "./types";

declare global {
	interface PresenterCommandMap {
		"get-pdf-response": {
			pdfData: ArrayBuffer;
		};
	}
}

let pdfCache: {
	fileName: string;
	pairId: string;
	pdfData: Promise<ArrayBuffer>;
} | null = null;

export function getPdfData(
	fileName: string,
	pairId: string,
): Promise<ArrayBuffer> {
	if (pdfCache?.fileName !== fileName || pdfCache?.pairId !== pairId) {
		pdfCache = {
			fileName,
			pairId,
			pdfData: new Promise<ArrayBuffer>((resolve, reject) => {
				const channel = getBroadcastChannel(fileName, pairId);
				const abortController = new AbortController();
				let settled = false;
				let retryTimer: ReturnType<typeof setTimeout> | null = null;
				let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
				let attempts = 0;
				const retryDelaysMs = [0, 200, 500, 1000, 1500];

				const cleanup = () => {
					abortController.abort();
					if (retryTimer) clearTimeout(retryTimer);
					if (timeoutTimer) clearTimeout(timeoutTimer);
				};

				const sendRequest = () => {
					channel.postMessage({
						from: "presentation",
						command: "get-pdf",
					} satisfies PresentationAction);
				};

				const scheduleRetry = () => {
					if (settled) return;
					const delay =
						retryDelaysMs[Math.min(attempts, retryDelaysMs.length - 1)];
					retryTimer = setTimeout(() => {
						if (settled) return;
						sendRequest();
						attempts += 1;
						if (attempts < retryDelaysMs.length) scheduleRetry();
					}, delay);
				};

				channel.addEventListener(
					"message",
					(event) => {
						const action = event.data as BroadcastAction;
						if (
							action.from === "presenter" &&
							action.command === "get-pdf-response"
						) {
							if (settled) return;
							settled = true;
							cleanup();
							resolve(action.pdfData);
						}
					},
					{ signal: abortController.signal },
				);
				sendRequest();
				attempts += 1;
				scheduleRetry();
				timeoutTimer = setTimeout(() => {
					if (settled) return;
					settled = true;
					cleanup();
					reject(new Error("TIMEOUT_LOADING_PDF_DATA"));
				}, 5000);
			}),
		};
	}
	return pdfCache.pdfData;
}
