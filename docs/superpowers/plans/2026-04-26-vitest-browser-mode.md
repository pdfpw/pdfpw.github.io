# Vitest Browser Mode 導入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitest 3 + jsdom 環境から Vitest 4 + Playwright ブラウザ環境へ全テストを移行し、Canvas / Web API を実ブラウザで動かす。

**Architecture:** `vite.config.ts` の `test` セクションにブラウザモード設定を追加し、jsdom 関連パッケージを削除。`@testing-library/react` を `vitest-browser-react` に置き換え。`// @vitest-environment` アノテーションを全削除。

**Tech Stack:** Vitest 4.1.5, @vitest/browser-playwright 4.1.5, vitest-browser-react 2.2.0, Playwright Chromium

---

### Task 1: パッケージの更新

**Files:**
- Modify: `package.json`

- [ ] **Step 1: jsdom と @testing-library 系パッケージを削除し、ブラウザモード用パッケージを追加**

```bash
cd /home/miyaji255/workspace/pdfpw.github.io
pnpm remove jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
pnpm add -D vitest@4.1.5 @vitest/browser-playwright@4.1.5 vitest-browser-react@2.2.0
```

- [ ] **Step 2: Playwright の Chromium バイナリをインストール**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 3: `package.json` の devDependencies を確認して意図通りになっていることを検証**

```bash
cat package.json | grep -E '"vitest|@vitest|vitest-browser|jsdom|@testing-library'
```

期待する出力（jsdom と @testing-library 系が消えていること）:
```
    "@vitest/browser-playwright": "4.1.5",
    "vitest": "^4.1.5",
    "vitest-browser-react": "^2.2.0",
```

- [ ] **Step 4: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: vitest 4 へアップグレード、ブラウザモード用パッケージを追加"
```

---

### Task 2: vite.config.ts をブラウザモード設定に変更

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: `vite.config.ts` の先頭に import を追加**

`vite.config.ts` の先頭（`import { exec } from "node:child_process";` の前）に追加:

```ts
import { playwright } from "@vitest/browser-playwright";
```

- [ ] **Step 2: `test` セクションを書き換える**

変更前:
```ts
	test: {
		globals: true,
		setupFiles: ["./src/test-setup.ts"],
	},
```

変更後:
```ts
	test: {
		globals: true,
		setupFiles: ["./src/test-setup.ts"],
		browser: {
			provider: playwright(),
			instances: [{ browser: "chromium" }],
		},
	},
```

- [ ] **Step 3: コミット**

```bash
git add vite.config.ts
git commit -m "feat: vite.config.ts にブラウザモード設定を追加"
```

---

### Task 3: test-setup.ts のクリーンアップ

**Files:**
- Modify: `src/test-setup.ts`

- [ ] **Step 1: jest-dom のインポートを削除して空ファイルにする**

`src/test-setup.ts` の内容を以下に書き換える（空ファイル、将来のグローバル設定用に残す）:

```ts
```

（ファイルを空にするか、以下のコマンドで実行）:
```bash
echo '' > src/test-setup.ts
```

- [ ] **Step 2: コミット**

```bash
git add src/test-setup.ts
git commit -m "chore: test-setup.ts から jest-dom を削除"
```

---

### Task 4: 純粋なロジックテストから @vitest-environment アノテーションを削除

対象: jsdom 固有の API に依存しない、または `// @vitest-environment jsdom/node` のアノテーションがあるファイル。

**Files:**
- Modify: `src/lib/keybindings.test.ts`
- Modify: `src/lib/format.test.ts`
- Modify: `src/lib/i18n.test.ts`
- Modify: `src/routes/index.test.tsx`

- [ ] **Step 1: keybindings.test.ts の 1 行目を削除**

`src/lib/keybindings.test.ts` の 1 行目:
```ts
// @vitest-environment jsdom
```
を削除する。それ以外は変更しない。

- [ ] **Step 2: format.test.ts の 1 行目を削除**

`src/lib/format.test.ts` の 1 行目:
```ts
// @vitest-environment jsdom
```
を削除する。それ以外は変更しない。

- [ ] **Step 3: i18n.test.ts の 1 行目を削除**

`src/lib/i18n.test.ts` の 1 行目:
```ts
// @vitest-environment node
```
を削除する。ブラウザモードでは全テストがブラウザで動くため不要。JSON import は Vite 経由で引き続き動作する。

- [ ] **Step 4: index.test.tsx の 1 行目を削除**

`src/routes/index.test.tsx` の 1 行目:
```ts
// @vitest-environment jsdom
```
を削除する。それ以外は変更しない。

- [ ] **Step 5: コミット**

```bash
git add src/lib/keybindings.test.ts src/lib/format.test.ts src/lib/i18n.test.ts src/routes/index.test.tsx
git commit -m "chore: @vitest-environment アノテーションを削除（ブラウザモードに不要）"
```

---

### Task 5: thumbnail.test.ts の Canvas モック削除

ブラウザ環境では実際の Canvas API が使えるため、`getContext` / `toDataURL` のモックが不要になる。
`getDocument`（PDF.js）のモックは引き続き維持する。

**Files:**
- Modify: `src/lib/thumbnail.test.ts`

- [ ] **Step 1: thumbnail.test.ts を以下の内容に置き換える**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
	default: "mock-worker.js",
}));
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
		mockGetDocument.mockReturnValue({
			promise: Promise.resolve(mockPdfProxy),
			// biome-ignore lint/suspicious/noExplicitAny: テスト用モック
		} as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("PDFの1ページ目のJPEG data URLを返す", async () => {
		const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
		const result = await generateThumbnail(file);
		expect(result).toMatch(/^data:image\/jpeg;base64,/);
		expect(mockGetDocument).toHaveBeenCalled();
		// biome-ignore lint/suspicious/noExplicitAny: テスト用モック
		const proxy = await (mockGetDocument.mock.results[0].value as any).promise;
		expect(proxy.getPage).toHaveBeenCalledWith(1);
	});

	it("PDF ロードエラー時は null を返す", async () => {
		mockGetDocument.mockImplementation(
			() =>
				({
					// Promise.reject を即時生成すると unhandled rejection になるため、lazy に生成する
					get promise() {
						return Promise.reject(new Error("load error"));
					},
					// biome-ignore lint/suspicious/noExplicitAny: テスト用モック
				}) as any,
		);
		const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
		const result = await generateThumbnail(file);
		expect(result).toBeNull();
	});
});
```

変更点の説明:
- `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` モックを削除（実ブラウザで動く）
- `vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')` モックを削除（実ブラウザで動く）
- "getContext が null を返す場合は null を返す" テストを削除（実ブラウザでは getContext が null を返さないため）
- `expect(result).toBe("data:image/jpeg;base64,abc")` → `expect(result).toMatch(/^data:image\/jpeg;base64,/)` に変更

- [ ] **Step 2: コミット**

```bash
git add src/lib/thumbnail.test.ts
git commit -m "test: thumbnail.test.ts から Canvas モックを削除（実ブラウザ API を使用）"
```

---

### Task 6: use-theme.test.ts と use-keybinding-help.test.ts の移行

`@testing-library/react` の `renderHook` / `act` を `vitest-browser-react` / `react` に置き換える。

**Files:**
- Modify: `src/hooks/use-theme.test.ts`
- Modify: `src/hooks/use-keybinding-help.test.ts`

- [ ] **Step 1: use-theme.test.ts を以下の内容に書き換える**

```ts
import { act } from "react";
import { renderHook } from "vitest-browser-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

function stubMatchMedia(prefersDark: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches:
				query === "(prefers-color-scheme: dark)" ? prefersDark : !prefersDark,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

describe("useTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		stubMatchMedia(true);
	});

	it("defaults to 'dark' when no localStorage and OS prefers dark", () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("defaults to 'light' when no localStorage and OS prefers light", () => {
		stubMatchMedia(false);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("reads saved theme from localStorage", () => {
		localStorage.setItem("pdfpw-theme", "light");
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("toggles between light and dark", async () => {
		const { result } = renderHook(() => useTheme());
		await act(() => {
			result.current.toggleTheme();
		});
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(localStorage.getItem("pdfpw-theme")).toBe("light");
	});

	it("syncs theme across windows via storage event", async () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("dark");
		await act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "pdfpw-theme",
					newValue: "light",
				}),
			);
		});
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("ignores storage events with unrelated keys", async () => {
		const { result } = renderHook(() => useTheme());
		await act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "unrelated",
					newValue: "light",
				}),
			);
		});
		expect(result.current.theme).toBe("dark");
	});
});
```

- [ ] **Step 2: use-keybinding-help.test.ts を以下の内容に書き換える**

```ts
import { act } from "react";
import { renderHook } from "vitest-browser-react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HELP_SEEN_KEY, useKeybindingHelp } from "./use-keybinding-help.ts";

describe("useKeybindingHelp", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("初期状態は閉じていて、まだヒントは見ていない", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));
		expect(result.current.isOpen).toBe(false);
		expect(result.current.shouldShowHint).toBe(true);
	});

	it("Shift+? キーで open し、localStorage が更新される", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		await act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			);
		});

		expect(result.current.isOpen).toBe(true);
		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');
	});

	it("F1 キーでも open する", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presentation"));

		await act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});

		expect(result.current.isOpen).toBe(true);
	});

	it("Shift+? を再度押すと close する (toggle)", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		await act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			);
		});
		expect(result.current.isOpen).toBe(true);

		await act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			);
		});
		expect(result.current.isOpen).toBe(false);
	});

	it("F1 は idempotent open (押しても close しない)", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		await act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});
		expect(result.current.isOpen).toBe(true);

		await act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});
		expect(result.current.isOpen).toBe(true);
	});

	it("INPUT にフォーカスがあると Shift+? を無視する", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		const input = document.createElement("input");
		document.body.appendChild(input);
		input.focus();

		await act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "?",
					shiftKey: true,
					bubbles: true,
				}),
			);
		});

		expect(result.current.isOpen).toBe(false);
		document.body.removeChild(input);
	});

	it("dismissHint() で shouldShowHint が false になる", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));
		expect(result.current.shouldShowHint).toBe(true);

		await act(() => {
			result.current.dismissHint();
		});

		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');
	});

	it("open() / close() メソッドで明示的に開閉できる", async () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		await act(() => {
			result.current.open();
		});
		expect(result.current.isOpen).toBe(true);
		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');

		await act(() => {
			result.current.close();
		});
		expect(result.current.isOpen).toBe(false);
	});
});
```

- [ ] **Step 3: コミット**

```bash
git add src/hooks/use-theme.test.ts src/hooks/use-keybinding-help.test.ts
git commit -m "test: hooks テストを vitest-browser-react に移行"
```

---

### Task 7: LocaleSwitcher.test.tsx の移行

`@testing-library/react` の `render` / `screen` / `fireEvent` を `vitest-browser-react` + `vitest/browser` に置き換える。

**Files:**
- Modify: `src/components/LocaleSwitcher.test.tsx`

- [ ] **Step 1: LocaleSwitcher.test.tsx を以下の内容に書き換える**

```tsx
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocaleSwitcher } from "./LocaleSwitcher.tsx";

function setupRouter(initialPath: string) {
	const rootRoute = createRootRoute({ component: () => <Outlet /> });
	const localeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/$locale",
		component: () => (
			<>
				<LocaleSwitcher />
				<Outlet />
			</>
		),
	});
	const indexRoute = createRoute({
		getParentRoute: () => localeRoute,
		path: "/",
		component: () => <div>home</div>,
	});
	const presenterRoute = createRoute({
		getParentRoute: () => localeRoute,
		path: "/presenter",
		component: () => <div>presenter</div>,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([
			localeRoute.addChildren([indexRoute, presenterRoute]),
		]),
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	return router;
}

describe("LocaleSwitcher", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => localStorage.clear());

	it("現在 locale ボタンに aria-pressed='true' が付く", async () => {
		const router = setupRouter("/en");
		const screen = render(<RouterProvider router={router} />);
		const enBtn = screen.getByRole("button", { name: /english/i });
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		await expect.element(enBtn).toHaveAttribute("aria-pressed", "true");
		await expect.element(jaBtn).toHaveAttribute("aria-pressed", "false");
	});

	it("ja ボタンクリックで /ja に navigate し localStorage が更新される", async () => {
		const router = setupRouter("/en");
		const screen = render(<RouterProvider router={router} />);
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		await jaBtn.click();
		await router.invalidate();
		expect(router.state.location.pathname.startsWith("/ja")).toBe(true);
		expect(localStorage.getItem("pdfpw:locale")).toBe("ja");
	});

	it("locale 切替で query string と hash が維持される", async () => {
		const router = setupRouter("/en/presenter?file=foo.pdf#section1");
		const screen = render(<RouterProvider router={router} />);
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		await jaBtn.click();
		await router.invalidate();
		expect(router.state.location.pathname).toBe("/ja/presenter");
		expect(router.state.location.searchStr).toBe("?file=foo.pdf");
		expect(router.state.location.hash).toBe("section1");
	});
});
```

変更点:
- `import { fireEvent, render, screen } from '@testing-library/react'` を削除
- `import { render } from 'vitest-browser-react'` を追加
- `render(...)` の戻り値を `screen` として受け取る形に変更
- `await screen.findByRole(...)` → `screen.getByRole(...)` に変更（Locator は遅延評価）
- `fireEvent.click(jaBtn)` → `await jaBtn.click()` に変更
- `screen.getByRole(...)` の戻り値は Locator なので `expect.element(...)` でアサート

- [ ] **Step 2: コミット**

```bash
git add src/components/LocaleSwitcher.test.tsx
git commit -m "test: LocaleSwitcher.test.tsx を vitest-browser-react に移行"
```

---

### Task 8: テスト全体を実行して動作確認

**Files:** なし（検証のみ）

- [ ] **Step 1: テストを実行する**

```bash
pnpm test
```

- [ ] **Step 2: 全テストが PASS していることを確認する**

期待する出力（エラーなし）:
```
 ✓ src/lib/pointer-state.test.ts
 ✓ src/lib/navigation-utils.test.ts
 ✓ src/lib/keybindings.test.ts
 ✓ src/lib/format.test.ts
 ✓ src/lib/i18n.test.ts
 ✓ src/lib/thumbnail.test.ts
 ✓ src/components/LocaleSwitcher.test.tsx
 ✓ src/hooks/use-theme.test.ts
 ✓ src/hooks/use-keybinding-help.test.ts
 ✓ src/routes/index.test.tsx
```

- [ ] **Step 3: 失敗したテストがあればデバッグして修正し、再コミット**

失敗パターンと対処:
- `cannot find module 'vitest-browser-react'` → Task 1 の `pnpm install` を再実行
- `act(...)` 周りの警告 → `await act(async () => { ... })` に変更
- Canvas 関連の失敗 → `thumbnail.test.ts` のモック設定を確認

- [ ] **Step 4: 型チェックを実行する**

```bash
pnpm tsc -b
```

エラーがあれば修正する。
