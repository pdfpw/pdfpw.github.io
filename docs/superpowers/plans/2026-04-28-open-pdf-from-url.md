# Open PDF from URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** URL から PDF を開く 2 経路 (A: `?pdf=https://...` クエリパラメータ、B: ホーム画面の URL 入力 UI) を実装し、CORS / HTTP / 非 PDF などの失敗を分かりやすいメッセージで案内する。

**Architecture:**
- 新規ユーティリティ `src/lib/fetch-pdf.ts` で URL からの取得・エラー分類を一元化 (純関数 + 型付きエラー `FetchPdfError`)。
- 同階層の sibling `.pdfpc` を best-effort で取得し、既存の pairing 規約 (`base.pdf` ↔ `base.pdfpc`) に揃える。
- ホーム画面 (`$locale/(main)/index.tsx`) に `?pdf=` を `validateSearch` で受け取り、マウント時に 1 回だけ取得実行。HeroSection に「URL から開く」トグル UI を追加し、フォーム送信で同じ取得関数を呼ぶ。
- 取得した `File` は既存の `handleFiles` に流すだけ (FSA ハンドルなし → 既存 Standard モードのスナップショット保存に乗る。`saveHistory=false` なら保存しない)。proxy サービスは導入しない (運用コスト + サーバー不要原則)。

**Tech Stack:** Fetch API、TanStack Router (`validateSearch` + typia)、Paraglide i18n、Vitest (browser mode)、React 19。

**関連 issue:** [#11](https://github.com/pdfpw/pdfpw.github.io/issues/11)

---

## File Map

| ファイル | 変更種別 | 担当 |
|---|---|---|
| `src/lib/fetch-pdf.ts` | 新規 | `fetchPdfFromUrl(url, opts)` と `FetchPdfError` (kind: `invalid-url` / `cors-or-network` / `http-error` / `not-pdf` / `aborted`) |
| `src/lib/fetch-pdf.test.ts` | 新規 | URL 取得・エラー分類・sibling pdfpc・abort のテスト |
| `messages/en.json` / `messages/ja.json` | 修正 | URL 入力 UI と失敗メッセージのキーを追加 |
| `src/routes/$locale/(main)/index.tsx` | 修正 | `validateSearch` で `pdf?: string` を受け、マウント時 1 回だけ自動取得。`onUrlSubmit` を HeroSection に渡す |
| `src/routes/$locale/(main)/-index/HeroSection.tsx` | 修正 | 「URL から開く」ボタン → 折りたたみフォーム (URL 入力 + 送信 + キャンセル + ヒント) |

---

## エラー分類とメッセージマッピング

| `FetchPdfError.kind` | 発生条件 | i18n key | 状態 |
|---|---|---|---|
| `invalid-url` | URL パース失敗 / 非 http(s) スキーム | `presenter_error_url_invalid` | ローカル即時 |
| `cors-or-network` | `fetch()` が `TypeError` で reject (CORS、DNS、オフライン等を区別不能) | `presenter_error_url_cors` | ネットワーク |
| `http-error` | `response.ok === false` | `presenter_error_url_http` ({status} 埋め込み) | サーバー応答済み |
| `not-pdf` | レスポンスバイトが PDF マジック (`%PDF-`) で始まらない | `presenter_error_url_not_pdf` | サーバー応答済み |
| `aborted` | `AbortSignal` 発火 | (status を null にして無音) | ユーザー操作 |

非 `FetchPdfError` 例外は `presenter_error_url_failed` で fallback。

進行中は `presenter_status_fetching_url` ({url} 埋め込み)。

---

## Task 1: `fetch-pdf` ユーティリティを実装

**Files:**
- Create: `src/lib/fetch-pdf.ts`

- [ ] **Step 1: 失敗テスト先行 — `parsePdfUrl` の不正系**

`src/lib/fetch-pdf.test.ts` を作って、後述 Task 2 の最初のテストだけ書ける状態にする。実体は Task 2 で書くのでここはスキップして Task 2 に飛んでよい。

- [ ] **Step 2: `fetch-pdf.ts` を作成**

```ts
// src/lib/fetch-pdf.ts
export type FetchPdfErrorKind =
	| "invalid-url"
	| "cors-or-network"
	| "http-error"
	| "not-pdf"
	| "aborted";

export class FetchPdfError extends Error {
	kind: FetchPdfErrorKind;
	status?: number;

	constructor(kind: FetchPdfErrorKind, message: string, status?: number) {
		super(message);
		this.name = "FetchPdfError";
		this.kind = kind;
		this.status = status;
	}
}

export interface FetchedPdf {
	pdf: File;
	pdfpc?: File;
	sourceUrl: string;
}

export interface FetchPdfOptions {
	signal?: AbortSignal;
	fetchImpl?: typeof fetch;
}

const PDF_MIME = "application/pdf";

function deriveBaseName(url: URL): string {
	const segments = url.pathname.split("/").filter(Boolean);
	const last = segments[segments.length - 1];
	if (!last) return "document.pdf";
	try {
		return decodeURIComponent(last);
	} catch {
		return last;
	}
}

function ensurePdfName(name: string): string {
	return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

function siblingPdfpcUrl(url: URL): URL | null {
	if (!/\.pdf$/i.test(url.pathname)) return null;
	const next = new URL(url.toString());
	next.pathname = next.pathname.replace(/\.pdf$/i, ".pdfpc");
	return next;
}

function looksLikePdfBytes(bytes: Uint8Array): boolean {
	// PDF magic header "%PDF-"
	return (
		bytes.length >= 5 &&
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46 &&
		bytes[4] === 0x2d
	);
}

export function parsePdfUrl(input: string): URL {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new FetchPdfError("invalid-url", `Invalid URL: ${input}`);
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new FetchPdfError(
			"invalid-url",
			`Unsupported protocol: ${url.protocol}`,
		);
	}
	return url;
}

async function fetchAsFile(
	url: URL,
	expectedMime: string,
	options: FetchPdfOptions,
): Promise<File> {
	const fetchImpl = options.fetchImpl ?? fetch;
	let response: Response;
	try {
		response = await fetchImpl(url.toString(), {
			signal: options.signal,
			redirect: "follow",
			credentials: "omit",
		});
	} catch (error) {
		if ((error as DOMException)?.name === "AbortError") {
			throw new FetchPdfError("aborted", "Fetch aborted");
		}
		throw new FetchPdfError(
			"cors-or-network",
			`Failed to fetch ${url.toString()}: ${(error as Error).message}`,
		);
	}

	if (!response.ok) {
		throw new FetchPdfError(
			"http-error",
			`HTTP ${response.status} ${response.statusText} for ${url.toString()}`,
			response.status,
		);
	}

	const buffer = await response.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	if (expectedMime === PDF_MIME && !looksLikePdfBytes(bytes)) {
		throw new FetchPdfError(
			"not-pdf",
			`Response from ${url.toString()} is not a PDF`,
		);
	}

	const name =
		expectedMime === PDF_MIME
			? ensurePdfName(deriveBaseName(url))
			: deriveBaseName(url);

	return new File([buffer], name, { type: expectedMime });
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function fetchPdfFromUrl(
	rawUrl: string,
	options: FetchPdfOptions = {},
): Promise<FetchedPdf> {
	const url = parsePdfUrl(rawUrl);
	const pdfFile = await fetchAsFile(url, PDF_MIME, options);

	let pdfpcFile: File | undefined;
	const pdfpcUrl = siblingPdfpcUrl(url);
	if (pdfpcUrl) {
		try {
			pdfpcFile = await fetchAsFile(pdfpcUrl, "application/json", options);
			const base = pdfFile.name.replace(/\.pdf$/i, "");
			if (
				!new RegExp(`^${escapeRegExp(base)}\\.pdfpc$`, "i").test(
					pdfpcFile.name,
				)
			) {
				pdfpcFile = new File([pdfpcFile], `${base}.pdfpc`, {
					type: "application/json",
				});
			}
		} catch (error) {
			if ((error as FetchPdfError)?.kind === "aborted") throw error;
			pdfpcFile = undefined;
		}
	}

	return { pdf: pdfFile, pdfpc: pdfpcFile, sourceUrl: url.toString() };
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/fetch-pdf.ts
git commit -m "feat(fetch-pdf): add URL fetcher with typed error kinds"
```

---

## Task 2: `fetch-pdf` のテスト

**Files:**
- Create: `src/lib/fetch-pdf.test.ts`

テストは vitest browser mode で動く前提。`fetchImpl` を注入して実ネットワークに出ない。

- [ ] **Step 1: テストを書く**

```ts
// src/lib/fetch-pdf.test.ts
import { describe, expect, it, vi } from "vitest";
import { FetchPdfError, fetchPdfFromUrl } from "./fetch-pdf.ts";

const PDF_MAGIC = new Uint8Array([
	0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
]); // "%PDF-1.7"

function pdfResponse(extraBytes: number[] = []): Response {
	const buf = new Uint8Array(PDF_MAGIC.length + extraBytes.length);
	buf.set(PDF_MAGIC, 0);
	buf.set(extraBytes, PDF_MAGIC.length);
	return new Response(buf, {
		status: 200,
		headers: { "Content-Type": "application/pdf" },
	});
}

function notFoundResponse(): Response {
	return new Response("not found", { status: 404, statusText: "Not Found" });
}

describe("fetchPdfFromUrl", () => {
	it("有効な PDF URL から File を取得する", async () => {
		const fetchImpl = vi.fn(async (input: string) => {
			if (input.endsWith(".pdf")) return pdfResponse([0x0a]);
			return notFoundResponse();
		}) as unknown as typeof fetch;

		const result = await fetchPdfFromUrl("https://example.com/slides.pdf", {
			fetchImpl,
		});
		expect(result.pdf.name).toBe("slides.pdf");
		expect(result.pdf.type).toBe("application/pdf");
		expect(result.pdfpc).toBeUndefined();
		expect(result.sourceUrl).toBe("https://example.com/slides.pdf");
	});

	it("sibling .pdfpc が見つかれば添付する", async () => {
		const fetchImpl = vi.fn(async (input: string) => {
			if (input.endsWith(".pdf")) return pdfResponse();
			if (input.endsWith(".pdfpc")) {
				return new Response('{"pdfpcFormat":2}', {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return notFoundResponse();
		}) as unknown as typeof fetch;

		const result = await fetchPdfFromUrl("https://example.com/foo.pdf", {
			fetchImpl,
		});
		expect(result.pdfpc).toBeDefined();
		expect(result.pdfpc?.name).toBe("foo.pdfpc");
	});

	it("無効な URL は invalid-url エラー", async () => {
		await expect(fetchPdfFromUrl("not a url")).rejects.toMatchObject({
			kind: "invalid-url",
		});
	});

	it("非 http(s) スキームは invalid-url エラー", async () => {
		await expect(fetchPdfFromUrl("file:///tmp/a.pdf")).rejects.toMatchObject({
			kind: "invalid-url",
		});
	});

	it("fetch が TypeError で失敗すると cors-or-network エラー", async () => {
		const fetchImpl = vi.fn(async () => {
			throw new TypeError("Failed to fetch");
		}) as unknown as typeof fetch;

		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect(err).toBeInstanceOf(FetchPdfError);
		expect((err as FetchPdfError).kind).toBe("cors-or-network");
	});

	it("非 200 レスポンスは http-error", async () => {
		const fetchImpl = vi.fn(
			async () => notFoundResponse(),
		) as unknown as typeof fetch;
		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("http-error");
		expect((err as FetchPdfError).status).toBe(404);
	});

	it("PDF マジックバイトが無いと not-pdf エラー", async () => {
		const fetchImpl = vi.fn(
			async () =>
				new Response("<html>not pdf</html>", {
					status: 200,
					headers: { "Content-Type": "text/html" },
				}),
		) as unknown as typeof fetch;
		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("not-pdf");
	});

	it("AbortSignal で aborted エラーになる", async () => {
		const fetchImpl = vi.fn(
			async (_input: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("aborted", "AbortError"));
					});
				}),
		) as unknown as typeof fetch;

		const ac = new AbortController();
		const promise = fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
			signal: ac.signal,
		});
		ac.abort();
		const err = await promise.then(() => null).catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("aborted");
	});

	it("URL 末尾が .pdf でなければファイル名に .pdf を補う", async () => {
		const fetchImpl = vi.fn(
			async () => pdfResponse(),
		) as unknown as typeof fetch;
		const result = await fetchPdfFromUrl("https://example.com/raw/slides", {
			fetchImpl,
		});
		expect(result.pdf.name).toBe("slides.pdf");
	});
});
```

- [ ] **Step 2: テスト実行**

```bash
pnpm test src/lib/fetch-pdf.test.ts
```

期待: 9 tests × 2 browser instances = 18 passed。

- [ ] **Step 3: コミット**

```bash
git add src/lib/fetch-pdf.test.ts
git commit -m "test(fetch-pdf): cover error classification and pdfpc sibling fetch"
```

---

## Task 3: i18n キーを追加

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ja.json`

- [ ] **Step 1: 既存 `hero_open_with_fsa` の直後に URL 入力 UI 用キーを追加**

`messages/en.json`:

```json
  "hero_open_with_fsa": "Open with File System Access",
  "hero_open_from_url": "Open from URL",
  "hero_url_input_label": "PDF URL",
  "hero_url_input_placeholder": "https://example.com/slides.pdf",
  "hero_url_submit": "Open",
  "hero_url_cancel": "Cancel",
  "hero_url_hint": "Host must allow CORS (e.g. GitHub raw, jsDelivr).",
  "hero_drop_label": "Drop a PDF here",
```

`messages/ja.json`:

```json
  "hero_open_with_fsa": "File System Access で開く",
  "hero_open_from_url": "URL から開く",
  "hero_url_input_label": "PDF の URL",
  "hero_url_input_placeholder": "https://example.com/slides.pdf",
  "hero_url_submit": "開く",
  "hero_url_cancel": "キャンセル",
  "hero_url_hint": "ホスト側の CORS 許可が必要です (GitHub raw / jsDelivr など)。",
  "hero_drop_label": "PDF をここにドロップ",
```

- [ ] **Step 2: 既存 `presenter_error_open_failed` の直後に URL 取得用キーを追加**

`messages/en.json`:

```json
  "presenter_error_open_failed": "Could not open the file.",
  "presenter_status_fetching_url": "Fetching \"{url}\"…",
  "presenter_error_url_invalid": "Please enter a valid http(s) URL.",
  "presenter_error_url_cors": "This server does not allow CORS. Use a CORS-enabled host (e.g. GitHub raw, jsDelivr).",
  "presenter_error_url_http": "Could not fetch the URL (HTTP {status}).",
  "presenter_error_url_not_pdf": "The URL did not return a PDF.",
  "presenter_error_url_failed": "Could not open the URL.",
```

`messages/ja.json`:

```json
  "presenter_error_open_failed": "ファイルを開けませんでした。",
  "presenter_status_fetching_url": "「{url}」を取得中…",
  "presenter_error_url_invalid": "有効な http(s) URL を入力してください。",
  "presenter_error_url_cors": "このサーバーは CORS を許可していません。CORS 対応のホスト (GitHub raw / jsDelivr など) を使ってください。",
  "presenter_error_url_http": "URL の取得に失敗しました (HTTP {status})。",
  "presenter_error_url_not_pdf": "URL は PDF を返しませんでした。",
  "presenter_error_url_failed": "URL を開けませんでした。",
```

- [ ] **Step 3: dev server 起動で paraglide 自動コンパイル → `src/paraglide/messages/*.js` に新規キーが出る**

```bash
# 別シェルで起動 → 1〜2 秒待ってログを確認 → Ctrl+C で停止
pnpm dev
```

または build で代替:

```bash
pnpm build
```

期待: `src/paraglide/messages/hero_open_from_url.js` などが出来ている。

- [ ] **Step 4: コミット**

```bash
git add messages/en.json messages/ja.json
git commit -m "i18n: add messages for URL-based PDF open flow"
```

---

## Task 4: ホームルートに `?pdf=` パラメータを追加

**Files:**
- Modify: `src/routes/$locale/(main)/index.tsx`

- [ ] **Step 1: import と Route 定義を更新**

ファイル先頭の import を以下に差し替え (該当ブロックのみ):

```tsx
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	Suspense,
	startTransition,
	useEffect,
	useId,
	useReducer,
	useRef,
	useState,
} from "react";
import * as typia from "typia";
import { useLocalStorageSync } from "#src/hooks/use-local-storage-sync";
import * as m from "#src/paraglide/messages.js";
import {
	canUseFSA,
	ensureHandleReadable,
	ensureHandleWritable,
} from "#src/lib/fsa";
import { FetchPdfError, fetchPdfFromUrl } from "#src/lib/fetch-pdf";
import {
	clearRecentStore,
	getRecentFiles,
	openDb,
	type RecentDb,
	type RecentFile,
	removeRecent,
	upsertRecent,
} from "#src/lib/recent-store";
import { generateThumbnail } from "#src/lib/thumbnail";
import { HeroSection } from "./-index/HeroSection";
import { HowItWorksSection } from "./-index/HowItWorksSection";
import { LibrarySection, LibrarySectionLoading } from "./-index/LibrarySection";
import { LibrarySectionData } from "./-index/LibrarySectionData";

let presentationWindow: Window | null = null;

export interface HomeSearch {
	pdf?: string;
}

export const Route = createFileRoute("/$locale/(main)/")({
	component: Home,
	validateSearch: typia.createValidate<HomeSearch>(),
});
```

- [ ] **Step 2: `Home` 関数の冒頭で search パラメータを読む**

```tsx
function Home() {
	const { locale } = Route.useParams();
	const { pdf: pdfUrlParam } = Route.useSearch();
	const [supportsFSA] = useState(() => canUseFSA());
	// ...以下既存
```

- [ ] **Step 3: `onOpenPicker` の直後に `onUrlSubmit` と auto-fetch effect を追加**

```tsx
	async function onUrlSubmit(rawUrl: string) {
		const trimmed = rawUrl.trim();
		if (!trimmed) return;
		setStatus(m.presenter_status_fetching_url({ url: trimmed }));
		try {
			const fetched = await fetchPdfFromUrl(trimmed);
			const files = fetched.pdfpc
				? [fetched.pdf, fetched.pdfpc]
				: [fetched.pdf];
			await handleFiles(files);
		} catch (error) {
			if (error instanceof FetchPdfError) {
				switch (error.kind) {
					case "invalid-url":
						setStatus(m.presenter_error_url_invalid());
						break;
					case "cors-or-network":
						setStatus(m.presenter_error_url_cors());
						break;
					case "http-error":
						setStatus(
							m.presenter_error_url_http({
								status: String(error.status ?? "?"),
							}),
						);
						break;
					case "not-pdf":
						setStatus(m.presenter_error_url_not_pdf());
						break;
					case "aborted":
						setStatus(null);
						break;
				}
			} else {
				setStatus(m.presenter_error_url_failed());
			}
		}
	}

	const autoOpenedUrlRef = useRef<string | null>(null);
	useEffect(() => {
		if (!pdfUrlParam) return;
		if (autoOpenedUrlRef.current === pdfUrlParam) return;
		autoOpenedUrlRef.current = pdfUrlParam;
		void onUrlSubmit(pdfUrlParam);
		// biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot per param
	}, [pdfUrlParam]);
```

`useRef` で「同一 URL は 1 度しか自動取得しない」を保証。`?pdf=` を変更すれば再実行。

- [ ] **Step 4: HeroSection への新 prop 受け渡し**

```tsx
				<HeroSection
					status={status}
					inputId={inputId}
					supportsFSA={supportsFSA}
					onOpenPicker={onOpenPicker}
					onFilesSelected={onFilesSelected}
					onUrlSubmit={onUrlSubmit}
				/>
```

- [ ] **Step 5: 型チェック**

```bash
pnpm tsc -b
```

期待: エラーなし (HeroSection 側は Task 5 で受ける口を実装するので、ここで型エラーが出る場合は Task 5 を先に進めてから戻る)。

- [ ] **Step 6: コミット**

```bash
git add src/routes/$locale/\(main\)/index.tsx
git commit -m "feat(home): wire ?pdf= search param and onUrlSubmit"
```

---

## Task 5: HeroSection に URL 入力フォームを追加

**Files:**
- Modify: `src/routes/$locale/(main)/-index/HeroSection.tsx`

UI 仕様:
- 既存「PDF を開く」「File System Access で開く」ボタンの並びに「URL から開く」ボタンを追加。
- クリックで折りたたみフォームを開く: ラベル付き text input + 「開く」ボタン + 「キャンセル」ボタン + ヒント文 (`hero_url_hint`)。
- Enter / submit で `onUrlSubmit(url)` を呼び、フォームを閉じる。空入力は無視。
- `onFilesSelected` 系は既存どおり保持。

- [ ] **Step 1: ファイル全体を以下の内容に置き換え**

```tsx
import { FileIcon, LinkIcon, PlusIcon } from "lucide-react";
import { type DragEvent, useId, useRef, useState } from "react";
import * as m from "#src/paraglide/messages.js";
import { Button } from "#src/components/ui/button";
import { cn } from "#src/lib/utils";

const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);

interface HeroSectionProps {
	status: string | null;
	inputId: string;
	supportsFSA: boolean;
	onOpenPicker: () => void;
	onFilesSelected: (files: File[]) => void | Promise<void>;
	onUrlSubmit: (url: string) => void | Promise<void>;
}

export function HeroSection({
	status,
	inputId,
	supportsFSA,
	onOpenPicker,
	onFilesSelected,
	onUrlSubmit,
}: HeroSectionProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragActive, setDragActive] = useState(false);
	const [urlMode, setUrlMode] = useState(false);
	const [urlValue, setUrlValue] = useState("");
	const urlInputId = useId();

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setDragActive(false);
		const files = Array.from(event.dataTransfer.files);
		if (files.length > 0) void onFilesSelected(files);
	}

	function handleDragOver(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		if (!dragActive) setDragActive(true);
	}

	function handleDragLeave() {
		setDragActive(false);
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = event.target.files ? Array.from(event.target.files) : [];
		if (files.length > 0) void onFilesSelected(files);
		event.target.value = "";
	}

	function handleUrlSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const value = urlValue.trim();
		if (!value) return;
		void onUrlSubmit(value);
		setUrlMode(false);
		setUrlValue("");
	}

	return (
		<section className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
			<div className="flex flex-col justify-center">
				<h1 className="mb-5 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl lg:text-[56px]">
					{m.hero_headline_line1()}
					<br />
					{m.hero_headline_line2()}
				</h1>
				<p className="mb-8 max-w-[42ch] text-[13px] leading-[1.6] text-muted">
					{m.hero_lead()}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="default"
						size="default"
						onClick={() => inputRef.current?.click()}
					>
						<PlusIcon className="size-4" />
						{m.hero_open_pdf()}
					</Button>
					{supportsFSA && (
						<Button
							type="button"
							variant="secondary"
							size="default"
							onClick={onOpenPicker}
						>
							{m.hero_open_with_fsa()}
						</Button>
					)}
					<Button
						type="button"
						variant="secondary"
						size="default"
						onClick={() => setUrlMode((prev) => !prev)}
						aria-expanded={urlMode}
						aria-controls={urlInputId}
					>
						<LinkIcon className="size-4" />
						{m.hero_open_from_url()}
					</Button>
				</div>
				{urlMode && (
					<form
						id={urlInputId}
						onSubmit={handleUrlSubmit}
						className="mt-4 flex flex-col gap-2"
					>
						<label
							htmlFor={`${urlInputId}-input`}
							className="text-[12px] font-medium text-muted"
						>
							{m.hero_url_input_label()}
						</label>
						<div className="flex flex-wrap gap-2">
							<input
								id={`${urlInputId}-input`}
								type="url"
								inputMode="url"
								autoFocus
								required
								placeholder={m.hero_url_input_placeholder()}
								value={urlValue}
								onChange={(e) => setUrlValue(e.target.value)}
								className="flex-1 min-w-[260px] rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
							/>
							<Button type="submit" variant="default" size="default">
								{m.hero_url_submit()}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="default"
								onClick={() => {
									setUrlMode(false);
									setUrlValue("");
								}}
							>
								{m.hero_url_cancel()}
							</Button>
						</div>
						<p className="text-[11px] text-muted">{m.hero_url_hint()}</p>
					</form>
				)}
				{status && (
					<output className="mt-6 text-[12px] text-muted">{status}</output>
				)}
			</div>

			<label
				htmlFor={inputId}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={cn(
					"group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
					dragActive
						? "border-accent bg-accent-soft"
						: "border-accent/50 bg-accent-soft/60 hover:bg-accent-soft",
				)}
			>
				<span
					aria-hidden
					className="flex size-12 items-center justify-center rounded-lg border border-dashed border-accent/70 text-accent"
				>
					<FileIcon className="size-5" />
				</span>
				<span className="text-[13px] font-medium text-accent">
					{m.hero_drop_label()}
				</span>
				<span className="font-mono text-[11px] text-muted">
					{m.hero_drop_hint_browse()} &middot;{" "}
					<kbd>{isMac ? "⌘O" : "Ctrl+O"}</kbd>
				</span>
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept=".pdf,.pdfpc,application/pdf,application/json"
					multiple
					onChange={handleFileChange}
					className="sr-only"
				/>
			</label>
		</section>
	);
}
```

- [ ] **Step 2: 型チェック**

```bash
pnpm tsc -b
```

期待: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add src/routes/$locale/\(main\)/-index/HeroSection.tsx
git commit -m "feat(hero): add URL input form for opening remote PDFs"
```

---

## Task 6: 動作確認 (手動)

CORS 許可のあるサンプル URL で経路 A / B を確認。

- [ ] **Step 1: dev server 起動**

```bash
pnpm dev
```

- [ ] **Step 2: 経路 B (UI) 確認**

ブラウザで http://localhost:6123/ja/ を開き「URL から開く」をクリック → 例えば `https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/basicapi.pdf` (CORS 許可済み) を入力 → presenter 画面に遷移。

- [ ] **Step 3: 経路 A (URL パラメータ) 確認**

`http://localhost:6123/ja/?pdf=https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/basicapi.pdf` を直接開く → 自動取得 → presenter 画面。

- [ ] **Step 4: CORS 失敗ケース確認**

`https://example.com/missing.pdf` のような CORS 非対応 URL を入力 → `hero_url_hint` と同等の CORS 案内 (`presenter_error_url_cors`) が status に出る。

- [ ] **Step 5: 不正 URL ケース確認**

`not a url` を入力 → `presenter_error_url_invalid`。

- [ ] **Step 6: HTTP 404 ケース確認**

CORS 許可ホストで存在しない URL (例 `https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/__nope__.pdf`) → `presenter_error_url_http` (status 404)。

---

## Task 7: 静的検証と最終コミット

- [ ] **Step 1: 全テスト**

```bash
pnpm test
```

期待: 全 pass (新規 9 ケース × 2 browser = 18 増加)。

- [ ] **Step 2: 型チェック**

```bash
pnpm tsc -b
```

- [ ] **Step 3: lint / format**

```bash
pnpm check
```

期待: clean (フォーマット差分があれば `pnpm format` で整形)。

- [ ] **Step 4: ビルド**

```bash
pnpm build
```

期待: 成功。

- [ ] **Step 5: 最終コミットがあればまとめ、PR 作成**

```bash
git status
gh pr create --title "feat: open PDF from URL (#11)" --body "$(cat <<'EOF'
## Summary
- ?pdf=URL クエリパラメータと、ホーム画面の「URL から開く」フォームの 2 経路を追加 (#11)
- fetch-pdf ユーティリティで CORS / HTTP / 非 PDF を分類し、丁寧な日本語/英語メッセージで案内
- sibling .pdfpc も best-effort で取得 (失敗は黙って無視)

## Test plan
- [ ] pnpm test 全 pass
- [ ] pnpm tsc -b clean
- [ ] pnpm check clean
- [ ] pnpm build 成功
- [ ] CORS 許可ホスト (jsDelivr / GitHub raw) からの取得が成功
- [ ] CORS 非対応ホストで CORS 案内が出る
- [ ] ?pdf= URL パラメータで自動取得 → presenter 遷移
EOF
)"
```

---

## Self-Review Notes

- スコープ網羅: A (URL パラメータ) → Task 4、B (UI) → Task 5、CORS 案内 → Task 1 + Task 3、recent-store 設計 → 既存 Standard モード相乗りで明示的変更不要 (FSA ハンドル無いため `saveHistory` ON 時のみスナップショット保存される)。
- プレースホルダ: 各 Step に実コード/コマンドあり、TBD なし。
- 型整合: `FetchPdfError` の `kind` enum、`HomeSearch.pdf?: string`、`HeroSectionProps.onUrlSubmit` の型は Task 1〜5 で一貫。
