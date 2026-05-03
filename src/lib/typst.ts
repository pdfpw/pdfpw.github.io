import type { TypstSource } from "./typst-source-detect";
export type { TypstSource } from "./typst-source-detect";

export interface TypstDiagnostic {
	severity: "error" | "warning";
	path: string;
	line: number; // 1-origin
	column: number; // 1-origin
	message: string;
	package?: string;
}

export type TypstProgress =
	| { stage: "loading-wasm" }
	| { stage: "fetching-packages"; current?: string }
	| { stage: "compiling" };

export interface CompileRequest {
	sources: TypstSource[];
	mainPath: string;
}

export type CompileResult =
	| { ok: true; pdf: Uint8Array }
	| { ok: false; diagnostics: TypstDiagnostic[] };

export interface CompileOptions {
	signal?: AbortSignal;
	onProgress?: (p: TypstProgress) => void;
}

export type WorkerInbound = { kind: "compile"; req: CompileRequest };
export type WorkerOutbound =
	| { kind: "progress"; payload: TypstProgress }
	| { kind: "result"; payload: CompileResult }
	| { kind: "fatal"; message: string };

export function compileTypst(
	req: CompileRequest,
	opts: CompileOptions = {},
): Promise<CompileResult> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL("../workers/typst-worker.ts", import.meta.url),
			{ type: "module" },
		);
		const cleanup = () => {
			worker.terminate();
			opts.signal?.removeEventListener("abort", onAbort);
		};
		const onAbort = () => {
			cleanup();
			reject(new DOMException("Aborted", "AbortError"));
		};
		if (opts.signal) {
			if (opts.signal.aborted) return onAbort();
			opts.signal.addEventListener("abort", onAbort);
		}

		worker.addEventListener("message", (ev: MessageEvent<WorkerOutbound>) => {
			const msg = ev.data;
			switch (msg.kind) {
				case "progress":
					opts.onProgress?.(msg.payload);
					break;
				case "result":
					cleanup();
					resolve(msg.payload);
					break;
				case "fatal":
					cleanup();
					reject(new Error(msg.message));
					break;
			}
		});
		worker.addEventListener("error", (ev) => {
			cleanup();
			reject(new Error(ev.message || "worker error"));
		});

		const inbound: WorkerInbound = { kind: "compile", req };
		worker.postMessage(inbound);
	});
}
