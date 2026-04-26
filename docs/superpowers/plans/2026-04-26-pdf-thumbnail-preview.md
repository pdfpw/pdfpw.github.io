# PDF Thumbnail Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LibrarySection のファイルカードに各PDFの1ページ目のJPEGサムネイルを表示する。

**Architecture:** ファイルを開いた時点（`handleFiles`）でPDF.jsを使い1ページ目をcanvasにレンダリングしてJPEG data URLを生成、`RecentFile` エントリと共にIndexedDBに保存する。Home画面ではDBから読み込んだdata URLを `<img>` タグで表示し、サムネイルがない古いエントリはアイコンにフォールバックする。

**Tech Stack:** PDF.js（`pdfjs-dist`）、IndexedDB（`idb`）、Vitest、React

---

## File Map

| ファイル | 変更種別 | 担当 |
|---|---|---|
| `src/lib/recent-store.ts` | 修正 | `RecentFile` に `thumbnail?: string` 追加 |
| `src/lib/thumbnail.ts` | 新規 | `generateThumbnail(pdf: File): Promise<string \| null>` |
| `src/lib/thumbnail.test.ts` | 新規 | `generateThumbnail` のユニットテスト |
| `src/routes/$locale/(main)/index.tsx` | 修正 | `handleFiles` でサムネイル生成・保存 |
| `src/routes/$locale/(main)/-index/LibrarySection.tsx` | 修正 | カードにサムネイル画像表示 |

---

## Task 1: RecentFile 型に thumbnail フィールドを追加

**Files:**
- Modify: `src/lib/recent-store.ts`

- [ ] **Step 1: thumbnail フィールドを追加**

`src/lib/recent-store.ts` の `RecentFile` 型を以下に変更する：

```typescript
export type RecentFile = {
  id: string;
  name: string;
  lastOpened: number;
  handle?: FileSystemFileHandle;
  configHandle?: FileSystemFileHandle;
  configName?: string;
  file?: File;
  configFile?: File;
  thumbnail?: string;
};
```

- [ ] **Step 2: 型チェックが通ることを確認**

```bash
pnpm tsc -b
```

Expected: エラーなし（オプショナルフィールドなのでDBスキーマ変更不要）

- [ ] **Step 3: コミット**

```bash
git add src/lib/recent-store.ts
git commit -m "feat: RecentFile に thumbnail フィールドを追加"
```

---

## Task 2: generateThumbnail ユーティリティをTDDで実装

**Files:**
- Create: `src/lib/thumbnail.ts`
- Create: `src/lib/thumbnail.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/thumbnail.test.ts` を新規作成：

```typescript
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "mock-worker.js" }));
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));

import * as pdfjs from "pdfjs-dist";
import { generateThumbnail } from "./thumbnail.ts";

describe("generateThumbnail", () => {
  const mockGetDocument = vi.mocked(pdfjs.getDocument);

  beforeEach(() => {
    const mockRender = vi.fn(() => ({ promise: Promise.resolve() }));
    const mockGetViewport = vi.fn((opts?: { scale?: number }) => ({
      width: 800 * (opts?.scale ?? 1),
      height: 600 * (opts?.scale ?? 1),
    }));
    const mockPage = {
      getViewport: mockGetViewport,
      render: mockRender,
    };
    const mockPdfProxy = {
      getPage: vi.fn(() => Promise.resolve(mockPage)),
      destroy: vi.fn(() => Promise.resolve()),
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
    mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockPdfProxy) } as any);

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
      {} as any,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/jpeg;base64,abc",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PDFの1ページ目のJPEG data URLを返す", async () => {
    const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const result = await generateThumbnail(file);
    expect(result).toBe("data:image/jpeg;base64,abc");
    expect(mockGetDocument).toHaveBeenCalled();
    // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
    const proxy = await (mockGetDocument.mock.results[0].value as any).promise;
    expect(proxy.getPage).toHaveBeenCalledWith(1);
  });

  it("getContext が null を返す場合は null を返す", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const result = await generateThumbnail(file);
    expect(result).toBeNull();
  });

  it("PDF ロードエラー時は null を返す", async () => {
    mockGetDocument.mockReturnValue(
      // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
      { promise: Promise.reject(new Error("load error")) } as any,
    );
    const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const result = await generateThumbnail(file);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
pnpm vitest run src/lib/thumbnail.test.ts
```

Expected: `Cannot find module './thumbnail.ts'` のようなエラーで FAIL

- [ ] **Step 3: thumbnail.ts を実装**

`src/lib/thumbnail.ts` を新規作成：

```typescript
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const THUMBNAIL_WIDTH = 400;

export async function generateThumbnail(pdf: File): Promise<string | null> {
  let pdfDoc: Awaited<ReturnType<typeof getDocument>["promise"]> | undefined;
  try {
    const arrayBuffer = await pdf.arrayBuffer();
    pdfDoc = await getDocument(arrayBuffer).promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = THUMBNAIL_WIDTH / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  } finally {
    await pdfDoc?.destroy();
  }
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
pnpm vitest run src/lib/thumbnail.test.ts
```

Expected: 3 tests passed

- [ ] **Step 5: 型チェックが通ることを確認**

```bash
pnpm tsc -b
```

Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/lib/thumbnail.ts src/lib/thumbnail.test.ts
git commit -m "feat: generateThumbnail ユーティリティを追加（PDF 1ページ目のJPEGサムネイル生成）"
```

---

## Task 3: handleFiles でサムネイルを生成して保存

**Files:**
- Modify: `src/routes/$locale/(main)/index.tsx`

- [ ] **Step 1: generateThumbnail のインポートを追加**

`src/routes/$locale/(main)/index.tsx` の既存 import 末尾（`import { LibrarySectionData } from ...` の後）に追加：

```typescript
import { generateThumbnail } from "#src/lib/thumbnail";
```

- [ ] **Step 2: handleFiles でサムネイルを生成し saveRecent の引数に含める**

`handleFiles` 内の `if (!pdf) { ... return }` の後、`const pdfHandle = ...` の前に以下を挿入：

```typescript
    const thumbnail = await generateThumbnail(pdf);
```

FSA モードの `saveRecent` 呼び出し（`if (pdfHandle && supportsFSA)` ブランチ）に `thumbnail` を追加：

```typescript
      await saveRecent({
        id: pdfHandle.name,
        name: pdf.name,
        handle: pdfHandle,
        configHandle: pdfpcHandle && pdfpc ? pdfpcHandle : undefined,
        configName:
          pdfpc && pdfpcHandle && sameBase(pdf.name, pdfpc.name)
            ? pdfpc.name
            : undefined,
        lastOpened: Date.now(),
        thumbnail: thumbnail ?? undefined,
      })
```

Standard モードの `saveRecent` 呼び出し（`else if (saveHistory)` ブランチ）にも `thumbnail` を追加：

```typescript
      await saveRecent({
        id: `snapshot-${pdf.name}-${Date.now()}`,
        name: pdf.name,
        file: pdf,
        configFile: pdfpc,
        configName: pdfpc?.name,
        lastOpened: Date.now(),
        thumbnail: thumbnail ?? undefined,
      })
```

- [ ] **Step 3: 型チェックが通ることを確認**

```bash
pnpm tsc -b
```

Expected: エラーなし

- [ ] **Step 4: テストが引き続きパスすることを確認**

```bash
pnpm test
```

Expected: all tests passed

- [ ] **Step 5: コミット**

```bash
git add "src/routes/\$locale/(main)/index.tsx"
git commit -m "feat: ファイルを開いた際にサムネイルを生成して RecentFile に保存"
```

---

## Task 4: LibrarySection のカードにサムネイル画像を表示

**Files:**
- Modify: `src/routes/$locale/(main)/-index/LibrarySection.tsx`

- [ ] **Step 1: カードのサムネイル部分を更新**

`LibrarySection.tsx` のカード内サムネイルエリア（`<div className="relative mb-2 aspect-[4/3] ...">` ブロック）を以下に置換する：

```tsx
                          <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-md bg-gradient-to-br from-surface to-bg">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt=""
                                className="absolute inset-0 h-full w-full object-contain"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-subtle">
                                {item.handle ? (
                                  <FileSymlink className="size-6" />
                                ) : (
                                  <FileClock className="size-6" />
                                )}
                              </div>
                            )}
                            {item.handle && (
                              <span
                                role="img"
                                aria-label={m.library_fsa_indicator_aria()}
                                className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-accent"
                              />
                            )}
                          </div>
```

- [ ] **Step 2: 型チェックが通ることを確認**

```bash
pnpm tsc -b
```

Expected: エラーなし

- [ ] **Step 3: 全テストがパスすることを確認**

```bash
pnpm test
```

Expected: all tests passed

- [ ] **Step 4: コミット**

```bash
git add "src/routes/\$locale/(main)/-index/LibrarySection.tsx"
git commit -m "feat: LibrarySection のカードに PDF サムネイルプレビューを表示"
```

---

## 動作確認

全タスク完了後、開発サーバーで動作を確認する：

```bash
pnpm dev
```

1. `http://localhost:6123` を開く
2. PDFファイルをドロップまたはファイル選択で開く
3. Homeに戻る（ブラウザの戻るボタン or `http://localhost:6123` に移動）
4. LibrarySection のカードに1ページ目のサムネイルが表示されることを確認
5. サムネイルがない古いエントリ（もしあれば）はアイコンのままなことを確認
