# Typst Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.typ` ファイルを直接受け付け、ブラウザ内で PDF にコンパイルしてから既存の PDF プレゼンパイプラインに合流させる。

**Architecture:** `index.tsx#handleFiles` 入口で `.typ` 検出 → Web Worker 上で `@myriaddreamin/typst.ts` (WASM) を動的 import しつつコンパイル → 結果 `Uint8Array` を `File("...pdf")` 化して既存処理に再入。D&D は `webkitGetAsEntry` でフォルダ込み再帰展開。診断は `TypstDiagnosticList` でインライン表示。

**Tech Stack:** TypeScript, React 19, Vite, vitest browser mode, `@myriaddreamin/typst.ts@^0.6.0`, `@myriaddreamin/typst-ts-web-compiler@^0.6.0`, Jotai, paraglide-js (i18n)

**Spec:** `docs/superpowers/specs/2026-05-03-typst-input-design.md`

---

## Task 1: 依存追加と最小スパイクで API を確定する

**Files:**
- Modify: `package.json`
- Create: `scratch/typst-spike.html` (一時、最後に削除)
- Create: `scratch/typst-spike.ts` (一時、最後に削除)

**目的:** typst.ts の Init/Compile API が想定通り動くことをローカルで確認し、後続タスクの実装前提を固める。失敗してから探すより、固める。

- [ ] **Step 1: 依存追加**

```bash
pnpm add @myriaddreamin/typst.ts@^0.6.0 @myriaddreamin/typst-ts-web-compiler@^0.6.0
```

- [ ] **Step 2: スパイク用 HTML を作る**

`scratch/typst-spike.html`:
```html
<!doctype html>
<html><body>
<pre id="out">running…</pre>
<script type="module" src="./typst-spike.ts"></script>
</body></html>
```

- [ ] **Step 3: スパイクスクリプトを書く**

`scratch/typst-spike.ts`:
```ts
import {
  createTypstCompiler,
  initOptions,
  MemoryAccessModel,
  FetchPackageRegistry,
} from "@myriaddreamin/typst.ts";
import wasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";

async function main() {
  const out = document.getElementById("out")!;
  const am = new MemoryAccessModel();
  const reg = new FetchPackageRegistry(am);
  const compiler = createTypstCompiler();
  await compiler.init({
    getModule: () => fetch(wasmUrl).then((r) => r.arrayBuffer()),
    beforeBuild: [initOptions.withAccessModel(am), initOptions.withPackageRegistry(reg)],
  });
  compiler.addSource("/main.typ", "= Hello\nWorld");
  const res = await compiler.compile({
    format: "pdf",
    mainFilePath: "/main.typ",
    diagnostics: "full",
  });
  out.textContent = JSON.stringify({
    okBytes: res.result?.length ?? 0,
    diags: res.diagnostics ?? [],
  });
}
void main();
```

- [ ] **Step 4: dev サーバーを起動して http://localhost:6123/scratch/typst-spike.html を開く**

```bash
pnpm dev
```

期待: `okBytes: ` が 0 でなく `diags: []`。失敗した場合は型エラー / `?url` 解決問題を解消してから次へ進む。

- [ ] **Step 5: 結果を確認したらスパイクを削除しコミット**

```bash
rm -rf scratch
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): add typst.ts and typst-ts-web-compiler (#12)"
```

---

## Task 2: ソース検出ユーティリティ (`typst-source-detect.ts`)

**Files:**
- Create: `src/lib/typst-source-detect.ts`
- Test: `src/lib/typst-source-detect.test.ts`

**目的:** 「Typst 入力か」「main はどれか」「D&D エントリの再帰展開」を純粋関数として用意する。Worker や React に依存しないので最初に固める。

### 2.1 `containsTypst` と `pickMainTypst`

- [ ] **Step 1: 失敗するテストを書く** — `src/lib/typst-source-detect.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { containsTypst, pickMainTypst, type TypstSource } from "./typst-source-detect";

const src = (path: string): TypstSource => ({ path, data: new Uint8Array() });

describe("containsTypst", () => {
  it("returns true when any file ends with .typ", () => {
    expect(containsTypst([src("main.typ")])).toBe(true);
    expect(containsTypst([src("a.pdf"), src("b.typ")])).toBe(true);
  });
  it("returns false otherwise", () => {
    expect(containsTypst([src("a.pdf")])).toBe(false);
    expect(containsTypst([])).toBe(false);
  });
});

describe("pickMainTypst", () => {
  it("returns the only .typ when single", () => {
    expect(pickMainTypst([src("hello.typ")])).toBe("hello.typ");
  });
  it("prefers main.typ at root when multiple", () => {
    expect(
      pickMainTypst([src("intro.typ"), src("main.typ"), src("appendix.typ")]),
    ).toBe("main.typ");
  });
  it("falls back to shallowest then alphabetical when no main.typ", () => {
    expect(
      pickMainTypst([
        src("chapters/01.typ"),
        src("chapters/02.typ"),
        src("zoo.typ"),
        src("alpha.typ"),
      ]),
    ).toBe("alpha.typ");
  });
  it("returns null when no .typ", () => {
    expect(pickMainTypst([src("a.pdf")])).toBe(null);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
pnpm test src/lib/typst-source-detect.test.ts
```

期待: `Cannot find module './typst-source-detect'`

- [ ] **Step 3: 最小実装**

`src/lib/typst-source-detect.ts`:
```ts
export interface TypstSource {
  /** プロジェクトルート相対パス。先頭スラッシュなし。例: "main.typ", "images/logo.png" */
  path: string;
  data: Uint8Array;
}

export function containsTypst(sources: TypstSource[]): boolean {
  return sources.some((s) => /\.typ$/i.test(s.path));
}

function depth(path: string): number {
  return path.split("/").length;
}

export function pickMainTypst(sources: TypstSource[]): string | null {
  const typs = sources.filter((s) => /\.typ$/i.test(s.path));
  if (typs.length === 0) return null;
  if (typs.length === 1) return typs[0].path;
  const root = typs.find((s) => s.path.toLowerCase() === "main.typ");
  if (root) return root.path;
  const sorted = [...typs].sort((a, b) => {
    const d = depth(a.path) - depth(b.path);
    if (d !== 0) return d;
    return a.path.localeCompare(b.path);
  });
  return sorted[0].path;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
pnpm test src/lib/typst-source-detect.test.ts
```

期待: 全 PASS。

- [ ] **Step 5: コミット**

```bash
git add src/lib/typst-source-detect.ts src/lib/typst-source-detect.test.ts
git commit -m "feat(typst): add source detection utilities (#12)"
```

### 2.2 `filesToTypstSources` (フラット File[] 変換)

- [ ] **Step 1: テスト追加** — `src/lib/typst-source-detect.test.ts` の末尾に追記:

```ts
describe("filesToTypstSources", () => {
  it("uses webkitRelativePath when present, otherwise file name", async () => {
    const a = new File(["hello"], "main.typ", { type: "text/plain" });
    const b = new File([new Uint8Array([1, 2])], "logo.png");
    Object.defineProperty(b, "webkitRelativePath", { value: "assets/logo.png" });
    const result = await filesToTypstSources([a, b]);
    expect(result.map((r) => r.path)).toEqual(["main.typ", "assets/logo.png"]);
    expect(result[1].data).toEqual(new Uint8Array([1, 2]));
  });
});
```

末尾の import 行に `filesToTypstSources` を追加。

- [ ] **Step 2: 失敗を確認**

```bash
pnpm test src/lib/typst-source-detect.test.ts
```

- [ ] **Step 3: 実装追加** — `src/lib/typst-source-detect.ts` 末尾に:

```ts
export async function filesToTypstSources(files: File[]): Promise<TypstSource[]> {
  return Promise.all(
    files.map(async (f) => ({
      path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      data: new Uint8Array(await f.arrayBuffer()),
    })),
  );
}
```

- [ ] **Step 4: テスト確認 + コミット**

```bash
pnpm test src/lib/typst-source-detect.test.ts
git add src/lib/typst-source-detect.ts src/lib/typst-source-detect.test.ts
git commit -m "feat(typst): convert File[] to TypstSource[] (#12)"
```

### 2.3 D&D 再帰展開 (`entriesToTypstSources`)

- [ ] **Step 1: テスト追加** — `src/lib/typst-source-detect.test.ts`:

```ts
describe("entriesToTypstSources", () => {
  it("recursively expands directory entries with relative paths", async () => {
    // モックの FileSystemEntry ツリー
    function fileEntry(name: string, content: string): any {
      return {
        isFile: true,
        isDirectory: false,
        name,
        file: (cb: (f: File) => void) => cb(new File([content], name)),
      };
    }
    function dirEntry(name: string, children: any[]): any {
      return {
        isFile: false,
        isDirectory: true,
        name,
        createReader: () => {
          let exhausted = false;
          return {
            readEntries: (cb: (e: any[]) => void) => {
              if (exhausted) return cb([]);
              exhausted = true;
              cb(children);
            },
          };
        },
      };
    }
    const root = [
      fileEntry("main.typ", "= Hi"),
      dirEntry("img", [fileEntry("a.png", "x")]),
    ];
    const result = await entriesToTypstSources(root);
    expect(result.map((r) => r.path).sort()).toEqual(["img/a.png", "main.typ"]);
  });
});
```

- [ ] **Step 2: 失敗を確認**

```bash
pnpm test src/lib/typst-source-detect.test.ts
```

- [ ] **Step 3: 実装追加** — `src/lib/typst-source-detect.ts` 末尾に:

```ts
type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (cb: (f: File) => void, err?: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (cb: (entries: FsEntry[]) => void, err?: (e: unknown) => void) => void;
  };
};

function readDirAll(reader: NonNullable<FsEntry["createReader"]> extends () => infer R ? R : never): Promise<FsEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FsEntry[] = [];
    const pump = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) return resolve(all);
        all.push(...batch);
        pump();
      }, reject);
    pump();
  });
}

async function entryToSources(entry: FsEntry, prefix: string): Promise<TypstSource[]> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
    return [{ path, data: new Uint8Array(await file.arrayBuffer()) }];
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const children = await readDirAll(reader);
    const nested = await Promise.all(children.map((c) => entryToSources(c, path)));
    return nested.flat();
  }
  return [];
}

export async function entriesToTypstSources(
  entries: ReadonlyArray<FsEntry | null>,
): Promise<TypstSource[]> {
  const filtered = entries.filter((e): e is FsEntry => !!e);
  const nested = await Promise.all(filtered.map((e) => entryToSources(e, "")));
  return nested.flat();
}
```

- [ ] **Step 4: テスト確認 + コミット**

```bash
pnpm test src/lib/typst-source-detect.test.ts
git add src/lib/typst-source-detect.ts src/lib/typst-source-detect.test.ts
git commit -m "feat(typst): recursively expand drag-drop directory entries (#12)"
```

---

## Task 3: Worker と `compileTypst` API (`src/lib/typst.ts` + worker)

**Files:**
- Create: `src/workers/typst-worker.ts`
- Create: `src/lib/typst.ts`
- Test: `src/lib/typst.test.ts`

**目的:** Worker でコンパイルし、進捗・結果・診断を main thread に渡す薄いラッパを作る。

### 3.1 メッセージプロトコルと型定義

- [ ] **Step 1: 型ファイル作成** — `src/lib/typst.ts`:

```ts
import type { TypstSource } from "./typst-source-detect";
export type { TypstSource } from "./typst-source-detect";

export interface TypstDiagnostic {
  severity: "error" | "warning";
  path: string;
  line: number;   // 1-origin
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
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/typst.ts
git commit -m "feat(typst): add worker message protocol and types (#12)"
```

### 3.2 Worker 実装

- [ ] **Step 1: Worker ファイル作成** — `src/workers/typst-worker.ts`:

```ts
import {
  createTypstCompiler,
  FetchPackageRegistry,
  initOptions,
  MemoryAccessModel,
} from "@myriaddreamin/typst.ts";
// Note: in typst.ts 0.6, withAccessModel/withPackageRegistry are exposed via the
// `initOptions` namespace re-export, not as top-level named exports.
import wasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import type {
  CompileRequest,
  CompileResult,
  TypstDiagnostic,
  WorkerInbound,
  WorkerOutbound,
} from "#src/lib/typst";

const RANGE_RE = /^(\d+):(\d+)-\d+:\d+$/;

function parseDiagnostic(d: {
  package: string;
  path: string;
  severity: string;
  range: string;
  message: string;
}): TypstDiagnostic {
  const m = RANGE_RE.exec(d.range);
  return {
    severity: d.severity === "warning" ? "warning" : "error",
    path: d.path,
    line: m ? Number(m[1]) : 1,
    column: m ? Number(m[2]) : 1,
    message: d.message,
    package: d.package || undefined,
  };
}

function post(msg: WorkerOutbound) {
  (self as unknown as Worker).postMessage(msg);
}

async function compile(req: CompileRequest): Promise<CompileResult> {
  post({ kind: "progress", payload: { stage: "loading-wasm" } });

  const am = new MemoryAccessModel();
  const reg = new FetchPackageRegistry(am);
  const compiler = createTypstCompiler();
  await compiler.init({
    getModule: () => fetch(wasmUrl).then((r) => r.arrayBuffer()),
    beforeBuild: [initOptions.withAccessModel(am), initOptions.withPackageRegistry(reg)],
  });

  for (const src of req.sources) {
    if (/\.typ$/i.test(src.path)) {
      compiler.addSource(`/${src.path}`, new TextDecoder().decode(src.data));
    } else {
      compiler.mapShadow(`/${src.path}`, src.data);
    }
  }

  // Note: typst.ts 0.6 does not expose package-fetch lifecycle events.
  // The `fetching-packages` stage in the protocol is reserved for future use
  // (custom PackageRegistry wrapper) and is currently never emitted here.
  post({ kind: "progress", payload: { stage: "compiling" } });
  const res = await compiler.compile({
    format: "pdf",
    mainFilePath: `/${req.mainPath}`,
    diagnostics: "full",
  });

  if (res.result && res.result.length > 0) {
    return { ok: true, pdf: res.result };
  }
  const diagnostics = (res.diagnostics ?? []).map(parseDiagnostic);
  return { ok: false, diagnostics };
}

self.addEventListener("message", async (ev: MessageEvent<WorkerInbound>) => {
  if (ev.data.kind !== "compile") return;
  try {
    const result = await compile(ev.data.req);
    post({ kind: "result", payload: result });
  } catch (err) {
    post({ kind: "fatal", message: err instanceof Error ? err.message : String(err) });
  }
});
```

- [ ] **Step 2: コミット**

```bash
git add src/workers/typst-worker.ts
git commit -m "feat(typst): worker that compiles .typ to PDF using typst.ts (#12)"
```

### 3.3 `compileTypst` クライアント関数

- [ ] **Step 1: テスト追加** — `src/lib/typst.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { compileTypst } from "./typst";

const enc = (s: string) => new TextEncoder().encode(s);

describe("compileTypst", () => {
  it("compiles a minimal .typ to a PDF", async () => {
    const res = await compileTypst({
      sources: [{ path: "main.typ", data: enc("= Hello\nWorld") }],
      mainPath: "main.typ",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.pdf.length).toBeGreaterThan(100);
      expect(new TextDecoder().decode(res.pdf.slice(0, 5))).toBe("%PDF-");
    }
  }, 60_000);

  it("returns diagnostics on syntax error", async () => {
    const res = await compileTypst({
      sources: [{ path: "main.typ", data: enc("#let x = (\n") }],
      mainPath: "main.typ",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.diagnostics.length).toBeGreaterThan(0);
      expect(res.diagnostics[0].severity).toBe("error");
    }
  }, 60_000);

  it("emits loading-wasm progress before compiling", async () => {
    const stages: string[] = [];
    await compileTypst(
      {
        sources: [{ path: "main.typ", data: enc("= Hi") }],
        mainPath: "main.typ",
      },
      { onProgress: (p) => stages.push(p.stage) },
    );
    expect(stages[0]).toBe("loading-wasm");
    expect(stages).toContain("compiling");
  }, 60_000);
});
```

- [ ] **Step 2: 失敗を確認**

```bash
pnpm test src/lib/typst.test.ts
```

期待: `compileTypst is not a function` または同等。

- [ ] **Step 3: クライアント実装** — `src/lib/typst.ts` 末尾に追記:

```ts
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
```

- [ ] **Step 4: テスト確認**

```bash
pnpm test src/lib/typst.test.ts
```

注: vitest browser mode で WASM とパッケージ取得が走るため初回 60 秒近くかかる可能性あり。タイムアウトは設定済み。

- [ ] **Step 5: コミット**

```bash
git add src/lib/typst.ts src/lib/typst.test.ts
git commit -m "feat(typst): compileTypst client with worker lifecycle (#12)"
```

---

## Task 4: i18n キーを追加する

**Files:**
- Modify: `messages/en.json`, `messages/ja.json`

- [ ] **Step 1: ja.json に追加** — `messages/ja.json` の末尾 `}` 直前に:

```json
  "typst_status_loading_wasm": "Typst エンジンを読み込み中…",
  "typst_status_fetching_packages": "Typst パッケージを取得中: {package}",
  "typst_status_compiling": "Typst をコンパイル中…",
  "typst_error_no_main": "Typst の主ファイル (main.typ) が見つかりません",
  "typst_error_compile_failed": "Typst のコンパイルに失敗しました ({count} 件のエラー)",
  "typst_error_runtime_init": "Typst エンジンの初期化に失敗しました",
  "typst_error_timeout": "Typst のコンパイルがタイムアウトしました",
  "typst_diag_severity_error": "エラー",
  "typst_diag_severity_warning": "警告",
```

- [ ] **Step 2: en.json に追加** — `messages/en.json` 同様に:

```json
  "typst_status_loading_wasm": "Loading Typst engine…",
  "typst_status_fetching_packages": "Fetching Typst package: {package}",
  "typst_status_compiling": "Compiling Typst…",
  "typst_error_no_main": "Could not find a Typst main file (main.typ)",
  "typst_error_compile_failed": "Typst compile failed ({count} errors)",
  "typst_error_runtime_init": "Failed to initialize Typst engine",
  "typst_error_timeout": "Typst compilation timed out",
  "typst_diag_severity_error": "error",
  "typst_diag_severity_warning": "warning",
```

- [ ] **Step 3: ビルドチェック**

```bash
pnpm tsc -b
```

paraglide が再生成して message ヘルパが TS 型に出ることを確認 (再生成は dev / build で自動)。

- [ ] **Step 4: コミット**

```bash
git add messages/en.json messages/ja.json
git commit -m "i18n(typst): add Typst status and error messages (#12)"
```

---

## Task 5: `TypstDiagnosticList` コンポーネント

**Files:**
- Create: `src/components/TypstDiagnosticList.tsx`
- Test: `src/components/TypstDiagnosticList.test.tsx`

- [ ] **Step 1: テストを書く** — `src/components/TypstDiagnosticList.test.tsx`:

```tsx
import { render } from "vitest-browser-react";
import { describe, expect, it } from "vitest";
import type { TypstDiagnostic } from "#src/lib/typst";
import { TypstDiagnosticList } from "./TypstDiagnosticList";

describe("TypstDiagnosticList", () => {
  it("renders one row per diagnostic with file:line:col and message", async () => {
    const items: TypstDiagnostic[] = [
      { severity: "error", path: "main.typ", line: 12, column: 5, message: "unknown variable: foo" },
      { severity: "warning", path: "main.typ", line: 20, column: 1, message: "deprecated" },
    ];
    const { getByText } = render(<TypstDiagnosticList items={items} />);
    await expect.element(getByText("main.typ:12:5")).toBeVisible();
    await expect.element(getByText("unknown variable: foo")).toBeVisible();
    await expect.element(getByText("main.typ:20:1")).toBeVisible();
  });
});
```

- [ ] **Step 2: 失敗を確認**

```bash
pnpm test src/components/TypstDiagnosticList.test.tsx
```

- [ ] **Step 3: 実装** — `src/components/TypstDiagnosticList.tsx`:

```tsx
import { AlertCircleIcon, AlertTriangleIcon } from "lucide-react";
import type { TypstDiagnostic } from "#src/lib/typst";
import * as m from "#src/paraglide/messages.js";
import { cn } from "#src/lib/utils";

interface Props {
  items: TypstDiagnostic[];
  max?: number;
}

export function TypstDiagnosticList({ items, max = 20 }: Props) {
  const errors = items.filter((d) => d.severity === "error").length;
  const shown = items.slice(0, max);
  const remaining = items.length - shown.length;
  return (
    <div className="mt-4 flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[12px]">
      <div className="font-medium text-destructive">
        {m.typst_error_compile_failed({ count: String(errors) })}
      </div>
      <ul className="flex flex-col gap-1 font-mono text-fg/80">
        {shown.map((d, i) => (
          <li key={i} className="flex items-start gap-2">
            {d.severity === "error" ? (
              <AlertCircleIcon className="mt-[2px] size-3.5 shrink-0 text-destructive" />
            ) : (
              <AlertTriangleIcon className="mt-[2px] size-3.5 shrink-0 text-amber-500" />
            )}
            <span className="shrink-0 text-muted">
              {d.path}:{d.line}:{d.column}
            </span>
            <span className={cn(d.severity === "error" ? "text-fg" : "text-muted")}>
              {d.message}
            </span>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <div className="text-[11px] text-muted">+ {remaining} more</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: テスト確認 + コミット**

```bash
pnpm test src/components/TypstDiagnosticList.test.tsx
git add src/components/TypstDiagnosticList.tsx src/components/TypstDiagnosticList.test.tsx
git commit -m "feat(typst): TypstDiagnosticList component (#12)"
```

---

## Task 6: HeroSection の `.typ` 受け入れと D&D フォルダ展開

**Files:**
- Modify: `src/routes/$locale/(main)/-index/HeroSection.tsx`

**目的:** `accept` に `.typ` を追加。D&D で `dataTransfer.items` がある場合は `webkitGetAsEntry()` 経由で再帰展開した `File[]` を返す (各 File に `webkitRelativePath` 相当のパスを乗せる)。`status` props は `string | ReactNode` に拡張して診断リスト描画を可能にする。

- [ ] **Step 1: 型と props 拡張** — `HeroSection.tsx` 22-30 行目付近を編集:

```tsx
interface HeroSectionProps {
  status: React.ReactNode | null;
  inputId: string;
  supportsFSA: boolean;
  locale: string;
  onOpenPicker: () => void;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onUrlSubmit: (pdfUrl: string, pdfpcUrl?: string) => void | Promise<void>;
}
```

`output` 描画箇所も `string` を `React.ReactNode` 扱いに:
```tsx
{status && (
  <div className="mt-6 text-[12px] text-muted">{status}</div>
)}
```

- [ ] **Step 2: D&D 再帰展開ヘルパを Hero 内ローカル関数として追加** — `handleDrop` の上に:

```tsx
async function expandDroppedItems(
  list: DataTransferItemList,
): Promise<File[]> {
  const entries = Array.from(list)
    .map((it) =>
      typeof (it as any).webkitGetAsEntry === "function"
        ? ((it as any).webkitGetAsEntry() as FileSystemEntry | null)
        : null,
    )
    .filter((e): e is FileSystemEntry => !!e);
  if (entries.length === 0) return [];
  const out: File[] = [];
  async function walk(entry: any, prefix: string): Promise<void> {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file: File = await new Promise((res, rej) => entry.file(res, rej));
      Object.defineProperty(file, "webkitRelativePath", { value: path });
      out.push(file);
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch: any[] = [];
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        for (const c of batch) await walk(c, path);
      } while (batch.length > 0);
    }
  }
  for (const e of entries) await walk(e, "");
  return out;
}
```

- [ ] **Step 3: `handleDrop` を更新**

```tsx
async function handleDrop(event: DragEvent<HTMLLabelElement>) {
  event.preventDefault();
  setDragActive(false);
  const items = event.dataTransfer.items;
  let files: File[];
  if (items && Array.from(items).some((it) => typeof (it as any).webkitGetAsEntry === "function")) {
    files = await expandDroppedItems(items);
  } else {
    files = Array.from(event.dataTransfer.files);
  }
  if (files.length > 0) void onFilesSelected(files);
}
```

`onDrop={handleDrop}` を `onDrop={(e) => void handleDrop(e)}` に変更。

- [ ] **Step 4: `accept` に `.typ` を追加** — 235 行目付近:

```tsx
accept=".pdf,.pdfpc,.typ,application/pdf,application/json"
```

- [ ] **Step 5: 型チェック**

```bash
pnpm tsc -b
```

- [ ] **Step 6: コミット**

```bash
git add src/routes/\$locale/\(main\)/-index/HeroSection.tsx
git commit -m "feat(home): accept .typ files and expand dropped folders (#12)"
```

---

## Task 7: `index.tsx#handleFiles` の Typst 分岐と `proceedWithPdf` 抽出

**Files:**
- Modify: `src/routes/$locale/(main)/index.tsx`

**目的:** `handleFiles` の本体 (PDF を受け取って recent 保存・navigate する部分) を `proceedWithPdf` ヘルパに切り出し、Typst 分岐は `compileTypst` 後にそのヘルパを呼ぶ。

- [ ] **Step 1: `proceedWithPdf` を抽出** — 既存 `handleFiles` の本体を以下に置き換え:

```tsx
async function proceedWithPdf(pdf: File, pdfpc: File | undefined, handles?: FileSystemFileHandle[]) {
  const sameBase = (pdfName: string, configName: string) => {
    const basePdf = pdfName.replace(/\.pdf$/i, "");
    const baseCfg = configName.replace(/\.pdfpc$/i, "");
    return basePdf.toLowerCase() === baseCfg.toLowerCase();
  };

  const thumbnail = await generateThumbnail(pdf);
  const pdfHandle = handles?.find((h) => h.name === pdf.name);
  const pdfpcHandle =
    pdf && pdfpc && sameBase(pdf.name, pdfpc.name)
      ? handles?.find((h) => h.name === pdfpc.name)
      : undefined;

  if (pdfHandle && supportsFSA) {
    await saveRecent({
      id: pdfHandle.name,
      name: pdf.name,
      handle: pdfHandle,
      configHandle: pdfpcHandle && pdfpc ? pdfpcHandle : undefined,
      configName:
        pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name) ? pdfpc.name : undefined,
      lastOpened: Date.now(),
      thumbnail: thumbnail ?? undefined,
    });
    const db = await openDb();
    startTransition(() => { refreshRecentFiles(db); });
  } else if (saveHistory) {
    await saveRecent({
      id: `snapshot-${pdf.name}-${Date.now()}`,
      name: pdf.name,
      file: pdf,
      configFile: pdfpc,
      configName: pdfpc?.name,
      lastOpened: Date.now(),
      thumbnail: thumbnail ?? undefined,
    });
    const db = await openDb();
    startTransition(() => { refreshRecentFiles(db); });
  }

  setStatus(
    pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
      ? m.presenter_status_loading_with_config({ file: pdf.name, config: pdfpc.name })
      : m.presenter_status_loading({ file: pdf.name }),
  );

  await router.navigate({
    to: "/$locale/presenter",
    params: { locale },
    search: { file: pdf.name },
    state: { pdf: pdfHandle ?? pdf, pdfpc: pdfpcHandle ?? pdfpc },
  });
  const url = router.buildLocation({
    to: "/$locale/presentation",
    params: { locale },
    search: { file: pdf.name },
  }).href;
  if (presentationWindow && !presentationWindow.closed) {
    presentationWindow.location.href = url;
    presentationWindow.focus();
  } else {
    presentationWindow = window.open(url, "_blank", "width=1200,height=675,resizable=yes");
  }
}
```

- [ ] **Step 2: `handleFiles` を Typst 分岐 + `proceedWithPdf` 委譲に書き換え**

ファイルの先頭に import を追加:
```tsx
import { compileTypst } from "#src/lib/typst";
import { containsTypst, filesToTypstSources, pickMainTypst } from "#src/lib/typst-source-detect";
import { TypstDiagnosticList } from "#src/components/TypstDiagnosticList";
```

`handleFiles` の中身を:
```tsx
async function handleFiles(files: File[], handles?: FileSystemFileHandle[]) {
  const sameBase = (pdfName: string, configName: string) => {
    const basePdf = pdfName.replace(/\.pdf$/i, "");
    const baseCfg = configName.replace(/\.pdfpc$/i, "");
    return basePdf.toLowerCase() === baseCfg.toLowerCase();
  };

  // Typst branch
  const sources = await filesToTypstSources(files);
  if (containsTypst(sources)) {
    const mainPath = pickMainTypst(sources);
    if (!mainPath) {
      setStatus(m.typst_error_no_main());
      return;
    }
    setStatus(m.typst_status_loading_wasm());
    const result = await compileTypst(
      { sources, mainPath },
      {
        onProgress: (p) => {
          if (p.stage === "loading-wasm") setStatus(m.typst_status_loading_wasm());
          else if (p.stage === "fetching-packages")
            setStatus(m.typst_status_fetching_packages({ package: p.current ?? "" }));
          else if (p.stage === "compiling") setStatus(m.typst_status_compiling());
        },
      },
    );
    if (!result.ok) {
      setStatus(<TypstDiagnosticList items={result.diagnostics} />);
      return;
    }
    const stem = mainPath.replace(/\.typ$/i, "").split("/").pop() ?? "main";
    const compiledPdf = new File([result.pdf], `${stem}.pdf`, { type: "application/pdf" });
    // pdfpc was supplied alongside the .typ?
    const pdfpc = files.find(
      (f) => /\.pdfpc$/i.test(f.name) && sameBase(`${stem}.pdf`, f.name),
    );
    await proceedWithPdf(compiledPdf, pdfpc);
    return;
  }

  // Existing PDF branch
  const pdf = files.find(
    (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
  );
  const pdfpc = pdf
    ? files.find((f) => /\.pdfpc$/i.test(f.name) && sameBase(pdf.name, f.name))
    : undefined;
  if (!pdf) {
    setStatus(m.presenter_error_no_pdf());
    return;
  }
  await proceedWithPdf(pdf, pdfpc, handles);
}
```

`setStatus` の型を `React.ReactNode | null` 受けに拡張:
```tsx
const [status, setStatus] = useState<React.ReactNode | null>(null);
```

- [ ] **Step 3: 型チェック**

```bash
pnpm tsc -b
```

- [ ] **Step 4: コミット**

```bash
git add src/routes/\$locale/\(main\)/index.tsx
git commit -m "feat(home): branch handleFiles for Typst input and compile to PDF (#12)"
```

---

## Task 8: 動作確認 (手動 smoke test)

**Files:** なし (手動)

- [ ] **Step 1: dev サーバー起動 → 最小 .typ で確認**

```bash
pnpm dev
```

ブラウザで http://localhost:6123 を開き、デスクトップで以下のファイルを作成して D&D:

`/tmp/hello.typ`:
```typst
= Hello pdfpw
This is a test from Typst.

#pagebreak()

= Slide two
- bullet
- another bullet
```

期待: 「Typst エンジンを読み込み中…」 → 「Typst をコンパイル中…」 → presenter 画面に遷移、2 ページ表示。

- [ ] **Step 2: パッケージ依存 (touying) で確認**

`/tmp/touying-mini.typ`:
```typst
#import "@preview/touying:0.5.5": *
#import themes.simple: *

#show: simple-theme.with(aspect-ratio: "16-9")

= First slide
== Hello

A demo.

= Second slide

Bullet:
- one
- two
```

D&D。期待: 「パッケージ取得中: ...」が見え、最終的に touying スタイルのスライドが presenter に表示される (初回 30 秒〜1 分)。

- [ ] **Step 3: 構文エラーで診断表示確認**

`/tmp/broken.typ`:
```typst
#let x = (
```

D&D。期待: HeroSection 下に `TypstDiagnosticList` が表示され、行番号付きエラーが見える。

- [ ] **Step 4: フォルダ D&D で確認**

```
/tmp/proj/
  main.typ      ← #image("logo.png") を含む
  logo.png
```

`main.typ`:
```typst
= Image test
#image("logo.png", width: 50%)
```

フォルダごと D&D。期待: 画像が埋め込まれた PDF として表示される。

- [ ] **Step 5: ピッカーから複数 .typ + .png 選択で確認** (フラット)

`hero_open_pdf` ボタンから `main.typ` + `logo.png` を一度に選択 (Ctrl/Cmd-click)。期待: フォルダなしと同じ結果。

- [ ] **Step 6: 全テスト + ビルド**

```bash
pnpm test
pnpm tsc -b
pnpm build
```

期待: すべてグリーン。production build が初回バンドルに typst.ts WASM を含めず、`.typ` を開いた時に動的読み込みされること (`dist/` の chunk 分割を確認)。

- [ ] **Step 7: 確認 OK ならコミット (本タスクで生まれる差分はないが、smoke 結果メモがあれば README/issue にコメント)**

なし。

---

## Task 9: Recent files への Typst ソース保存 (オプション、issue クローズ前に必須)

**Files:**
- Modify: `src/lib/recent-store.ts`
- Modify: `src/routes/$locale/(main)/index.tsx`

**目的:** Typst ソースを履歴に保存して、次回再オープン時に再コンパイル → PDF パイプラインへ。

### 9.1 RecentTypstFile 型と CRUD

- [ ] **Step 1: `recent-store.ts` の `RecentFile` を拡張**

既存型を以下のように:
```ts
export interface RecentPdfFile {
  kind?: "pdf";   // 未設定 = 既存エントリ (互換性のため optional)
  id: string;
  name: string;
  handle?: FileSystemFileHandle;
  configHandle?: FileSystemFileHandle;
  configName?: string;
  file?: File;
  configFile?: File;
  lastOpened: number;
  thumbnail?: string;
}

export interface RecentTypstFile {
  kind: "typst";
  id: string;
  name: string;        // main .typ のファイル名
  mainPath: string;    // プロジェクト相対パス
  handle?: FileSystemFileHandle;          // main .typ の handle
  assetHandles?: FileSystemFileHandle[];  // 同階層の他ファイル (FSA)
  file?: File;                            // main .typ の File (snapshot)
  assetFiles?: File[];                    // その他のソース (snapshot, webkitRelativePath 保持)
  configHandle?: FileSystemFileHandle;
  configFile?: File;
  configName?: string;
  lastOpened: number;
  thumbnail?: string;
}

export type RecentFile = RecentPdfFile | RecentTypstFile;
```

`getRecentFiles` の読み出し時、`kind` 未設定エントリは `kind: "pdf"` として default する(既存スキーマ互換)。`upsertRecent` は `kind` を必ず付けて保存。

- [ ] **Step 2: 型エラーがないか確認**

```bash
pnpm tsc -b
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/recent-store.ts
git commit -m "feat(recent): support RecentTypstFile entries (#12)"
```

### 9.2 保存と再オープン

- [ ] **Step 1: `proceedWithPdf` から `proceedWithPdf` を「Typst 由来かどうか」を受けるよう拡張**

`index.tsx` の `proceedWithPdf` シグネチャを変更:
```tsx
async function proceedWithPdf(
  pdf: File,
  pdfpc: File | undefined,
  handles?: FileSystemFileHandle[],
  typstMeta?: {
    mainPath: string;
    sourceFile?: File;
    assetFiles?: File[];
    sourceHandle?: FileSystemFileHandle;
    assetHandles?: FileSystemFileHandle[];
  },
) {
```

`saveRecent` の中身を `typstMeta` がある場合は `RecentTypstFile` として保存する分岐に。FSA mode かつ `typstMeta.sourceHandle` あり → handle ベース、なければ file ベース。

具体: `if (pdfHandle && supportsFSA) { ... }` の中の `saveRecent({ ... })` を以下に分岐:
```tsx
if (typstMeta) {
  await saveRecent({
    kind: "typst",
    id: typstMeta.sourceHandle?.name ?? `snapshot-typst-${pdf.name}-${Date.now()}`,
    name: typstMeta.sourceFile?.name ?? typstMeta.sourceHandle?.name ?? pdf.name,
    mainPath: typstMeta.mainPath,
    handle: typstMeta.sourceHandle,
    assetHandles: typstMeta.assetHandles,
    file: typstMeta.sourceFile,
    assetFiles: typstMeta.assetFiles,
    configHandle: pdfpcHandle && pdfpc ? pdfpcHandle : undefined,
    configFile: !pdfHandle ? pdfpc : undefined,
    configName: pdfpc?.name,
    lastOpened: Date.now(),
    thumbnail: thumbnail ?? undefined,
  });
}
else if (pdfHandle && supportsFSA) {
  // 既存 PDF 経路
}
else if (saveHistory) {
  // 既存 PDF snapshot 経路
}
```

(既存ブランチの中身はそのまま残す。Typst 分岐を先に評価。)

- [ ] **Step 2: `handleFiles` の Typst 分岐で `typstMeta` を組み立てて渡す**

```tsx
const mainSourceFile = files.find((f) =>
  ((f as any).webkitRelativePath || f.name) === mainPath,
);
const assetFiles = files.filter((f) => f !== mainSourceFile && !/\.pdfpc$/i.test(f.name));
await proceedWithPdf(compiledPdf, pdfpc, undefined, {
  mainPath,
  sourceFile: mainSourceFile,
  assetFiles,
});
```

(MVP では FSA picker からの `.typ` 選択フローはスコープ外、`sourceHandle/assetHandles` は省略可。)

- [ ] **Step 3: `onRecentClick` に Typst 再オープンを追加**

```tsx
async function onRecentClick(item: RecentFile) {
  if (item.kind === "typst") {
    if (item.handle) {
      const canRead = await ensureHandleReadable(item.handle);
      if (!canRead) { setStatus(m.presenter_error_permission_denied()); return; }
      const main = await item.handle.getFile();
      const assets = await Promise.all(
        (item.assetHandles ?? []).map((h) => h.getFile()),
      );
      const cfg = item.configHandle ? [await item.configHandle.getFile()] : [];
      await handleFiles([main, ...assets, ...cfg]);
      return;
    }
    if (item.file) {
      const cfg = item.configFile ? [item.configFile] : [];
      await handleFiles([item.file, ...(item.assetFiles ?? []), ...cfg]);
      return;
    }
    return;
  }
  // 既存 PDF 分岐 (そのまま)
}
```

- [ ] **Step 4: 型チェック**

```bash
pnpm tsc -b
```

- [ ] **Step 5: 動作確認**

```bash
pnpm dev
```

- ブラウザで `.typ` を D&D → presenter 起動
- 元のページ (Home) に戻り Library セクションを見る → Typst エントリが表示されている
- そのエントリをクリック → 再コンパイル走り、再び presenter 起動

- [ ] **Step 6: コミット**

```bash
git add src/routes/\$locale/\(main\)/index.tsx
git commit -m "feat(home): persist Typst sources to recent files and reopen via recompile (#12)"
```

---

## 完了条件

- [ ] `.typ` を D&D / ファイル選択 / FSA ピッカーから受け付け、PDF にコンパイルされて既存 presenter フローに合流する
- [ ] D&D でフォルダごと投げると `webkitGetAsEntry` で再帰展開される
- [ ] 公式パッケージ (touying) を `#import` した `.typ` がコンパイルできる
- [ ] 構文エラー時に `TypstDiagnosticList` が HeroSection 下に表示される
- [ ] Typst ソースが Recent files に保存され、再オープンで再コンパイルされる
- [ ] `pnpm test` / `pnpm tsc -b` / `pnpm build` がすべて通る
- [ ] 初回バンドルに typst.ts WASM が含まれない (Vite のチャンク分割を build 出力で確認)
