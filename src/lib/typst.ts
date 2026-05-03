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
