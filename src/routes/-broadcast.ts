import { use, useEffect, useEffectEvent } from "react";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";

type BroadcastActionFromPresenter = {
	from: "presenter";
} & (
	| {
			command: "get-config-response";
			pdfpcConfig: ResolvedPdfpcConfigV2;
	  }
	| {
			command: "get-pdf-response";
			pdfData: ArrayBuffer;
	  }
	| {
			command: "send-current-page-number";
			pageNumber: number;
	  }
);
type BroadcastActionFromPresentation = {
	from: "presentation";
} & (
	| {
			command: "get-config";
	  }
	| {
			command: "get-pdf";
	  }
);
export type BroadcastAction =
	| BroadcastActionFromPresenter
	| BroadcastActionFromPresentation;

let channelCache: { fileName: string; channel: BroadcastChannel } | null = null;
export function getBroadcastChannel(fileName: string) {
	if (channelCache?.fileName !== fileName) {
		channelCache?.channel.close();
		channelCache = {
			fileName,
			channel: new BroadcastChannel(`pdfpw:${fileName}`),
		};
	}
	return channelCache.channel;
}

export function usePresentationBroadcast(
	fileName: string,
	onPageNumberChange: (pageNumber: number) => void,
) {
	const handleMessage = useEffectEvent(
		(action: BroadcastActionFromPresenter) => {
			switch (action.command) {
				case "send-current-page-number":
					onPageNumberChange(action.pageNumber);
					break;
			}
		},
	);

	useEffect(() => {
		const channel = getBroadcastChannel(fileName);
		const abortController = new AbortController();
		channel.addEventListener(
			"message",
			(event) => {
				const action = event.data as BroadcastAction;
				if (action.from === "presenter") handleMessage(action);
			},
			{ signal: abortController.signal },
		);
		return () => {
			abortController.abort();
		};
	}, [fileName]);
}

export function usePresenterBroadcast(
	fileName: string,
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pdf: File | FileSystemFileHandle,
) {
	const channel = getBroadcastChannel(fileName);
	const handleMessage = useEffectEvent(
		(action: BroadcastActionFromPresentation) => {
			switch (action.command) {
				case "get-config":
					channel.postMessage({
						from: "presenter",
						command: "get-config-response",
						pdfpcConfig,
					} satisfies BroadcastActionFromPresenter);
					break;
				case "get-pdf":
					Promise.resolve(pdf instanceof File ? pdf : pdf.getFile()).then(
						async (file) => {
							const channel = getBroadcastChannel(fileName);
							const buffer = await file.arrayBuffer();
							channel.postMessage({
								from: "presenter",
								command: "get-pdf-response",
								pdfData: buffer,
							} satisfies BroadcastActionFromPresenter);
						},
					);
					break;
			}
		},
	);

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
}

let configCache: {
	fileName: string;
	config: Promise<ResolvedPdfpcConfigV2>;
} | null = null;
export function useConfig(fileName: string) {
	if (configCache?.fileName !== fileName) {
		configCache = {
			fileName,
			config: new Promise<ResolvedPdfpcConfigV2>((resolve, reject) => {
				const channel = getBroadcastChannel(fileName);
				channel.postMessage({
					from: "presentation",
					command: "get-config",
				} satisfies BroadcastActionFromPresentation);
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

let pdfCache: {
	fileName: string;
	pdfData: Promise<ArrayBuffer>;
} | null = null;
export function getPdfData(fileName: string): Promise<ArrayBuffer> {
	if (pdfCache?.fileName !== fileName) {
		pdfCache = {
			fileName,
			pdfData: new Promise<ArrayBuffer>((resolve, reject) => {
				const channel = getBroadcastChannel(fileName);
				channel.postMessage({
					from: "presentation",
					command: "get-pdf",
				} satisfies BroadcastActionFromPresentation);
				const abortController = new AbortController();
				channel.addEventListener(
					"message",
					(event) => {
						const action = event.data as BroadcastAction;
						if (
							action.from === "presenter" &&
							action.command === "get-pdf-response"
						) {
							resolve(action.pdfData);
						}
					},
					{ signal: abortController.signal },
				);
				setTimeout(() => {
					abortController.abort();
					reject(new Error("TIMEOUT_LOADING_PDF_DATA"));
				}, 5000);
			}),
		};
	}
	return pdfCache.pdfData;
}
