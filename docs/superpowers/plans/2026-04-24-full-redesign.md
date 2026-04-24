# PDFPW 全体リデザイン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設計書 `docs/superpowers/specs/2026-04-24-full-redesign-design.md` に従い、Technical Precision (ダーク既定 + cyan #06B6D4) の方向性で PDFPW 全体のビジュアルと情報設計を刷新する。

**Architecture:** Tailwind v4 + CVA + Radix UI のままコード構造は維持し、`src/styles.css` のトークンを全面刷新 → 共通 UI の variant 書換 → ヘッダー+テーマトグル → ランディング IA 刷新 → プレゼンター/プレゼンテーション視覚刷新、の順でフェーズ毎にコミットして安全に進める。プレゼンター画面の 3 エリア grid 構造と broadcast 機構・PDF Canvas レンダリングは一切変更しない。

**Tech Stack:** Tailwind CSS v4, CVA, Radix UI, lucide-react, `@fontsource/geist-sans`, `@fontsource/geist-mono`, Vitest (既存)

**実装フェーズ:**
1. デザイントークン + フォント
2. 共通 UI コンポーネント variants
3. ヘッダー + テーマトグル
4. ランディング画面
5. プレゼンター画面
6. プレゼンテーション画面
7. 最終確認

---

## Phase 1: デザイントークン + フォント

### Task 1.1: `@fontsource/geist-sans` / `@fontsource/geist-mono` をインストール

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (自動)

- [ ] **Step 1: インストール**

Run: `pnpm add @fontsource/geist-sans @fontsource/geist-mono`

- [ ] **Step 2: 導入確認**

`package.json` の `dependencies` に 2 つ追加されていることを確認。`node_modules/@fontsource/geist-sans/400.css` が存在することを確認 (`ls node_modules/@fontsource/geist-sans/` で `400.css`, `500.css`, `600.css` 等が見えるはず)。

- [ ] **Step 3: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Geist fonts via @fontsource"
```

---

### Task 1.2: `src/styles.css` を新トークンで書き換え

**Files:**
- Modify: `src/styles.css` (全面書き換え)

- [ ] **Step 1: ファイル全体を差し替え**

以下の内容で `src/styles.css` を置換:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@fontsource/geist-sans/400.css';
@import '@fontsource/geist-sans/500.css';
@import '@fontsource/geist-sans/600.css';
@import '@fontsource/geist-mono/400.css';
@import '@fontsource/geist-mono/500.css';
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

body {
  @apply m-0;
  font-family:
    'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans',
    'Yu Gothic UI', 'Noto Sans JP', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: 'Geist Mono', ui-monospace, 'JetBrains Mono', Menlo, Monaco, Consolas,
    monospace;
}

/* Light (default when no .dark) */
:root {
  --bg: #FAFAFA;
  --surface: #FFFFFF;
  --raised: #FFFFFF;
  --overlay: #FFFFFF;

  --fg: #0B0B0F;
  --muted: #52525B;
  --subtle: #A1A1AA;

  --border: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.14);

  --accent: #0891B2;
  --accent-hi: #06B6D4;
  --accent-lo: #0E7490;
  --accent-fg: #FFFFFF;
  --accent-soft: rgba(8, 145, 178, 0.08);

  --danger: #EF4444;
  --warning: #F59E0B;
  --success: #10B981;
  --info: #38BDF8;

  --blackout: #000000;

  /* Shim for existing tokens: keep old names working while components migrate */
  --background: var(--bg);
  --foreground: var(--fg);
  --card: var(--raised);
  --card-foreground: var(--fg);
  --popover: var(--overlay);
  --popover-foreground: var(--fg);
  --primary: var(--accent);
  --primary-foreground: var(--accent-fg);
  --secondary: var(--surface);
  --secondary-foreground: var(--fg);
  --muted-foreground: var(--muted);
  --accent-foreground: var(--fg);
  --destructive: var(--danger);
  --destructive-foreground: #FFFFFF;
  --input: var(--border);
  --ring: var(--accent);

  --timer-pretalk: var(--success);
  --timer-too-fast: var(--info);
  --timer-too-slow: var(--warning);
  --timer-overtime: var(--danger);

  --radius-sm: 4px;
  --radius: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-focus: 0 0 0 2px rgba(6, 182, 212, 0.55);
}

.dark {
  --bg: #070709;
  --surface: #0B0B0F;
  --raised: #12121A;
  --overlay: #1C1C24;

  --fg: #F5F5F7;
  --muted: #A8A8B2;
  --subtle: #6A6A75;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  --accent: #06B6D4;
  --accent-hi: #22D3EE;
  --accent-lo: #0891B2;
  --accent-fg: #052B33;
  --accent-soft: rgba(6, 182, 212, 0.10);

  --danger: #EF4444;
  --warning: #F59E0B;
  --success: #10B981;
  --info: #38BDF8;

  --blackout: #000000;

  /* Legacy shims (dark variant) */
  --background: var(--bg);
  --foreground: var(--fg);
  --card: var(--raised);
  --card-foreground: var(--fg);
  --popover: var(--overlay);
  --popover-foreground: var(--fg);
  --primary: var(--accent);
  --primary-foreground: var(--accent-fg);
  --secondary: var(--surface);
  --secondary-foreground: var(--fg);
  --muted-foreground: var(--muted);
  --accent-foreground: var(--fg);
  --destructive: var(--danger);
  --destructive-foreground: #FFFFFF;
  --input: var(--border);
  --ring: var(--accent);

  --timer-pretalk: var(--success);
  --timer-too-fast: var(--info);
  --timer-too-slow: var(--warning);
  --timer-overtime: var(--danger);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.20);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.24);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.32);
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-raised: var(--raised);
  --color-overlay: var(--overlay);

  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-subtle: var(--subtle);

  --color-border: var(--border);
  --color-border-strong: var(--border-strong);

  --color-accent: var(--accent);
  --color-accent-hi: var(--accent-hi);
  --color-accent-lo: var(--accent-lo);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);

  --color-danger: var(--danger);
  --color-warning: var(--warning);
  --color-success: var(--success);
  --color-info: var(--info);

  --color-blackout: var(--blackout);

  /* Legacy alias colors (so existing `bg-background`, `text-foreground` etc keep working) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-timer-pretalk: var(--timer-pretalk);
  --color-timer-too-fast: var(--timer-too-fast);
  --color-timer-too-slow: var(--timer-too-slow);
  --color-timer-overtime: var(--timer-overtime);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-bg text-fg;
    /* Default to dark theme until useTheme hook decides */
    background: var(--bg);
    color: var(--fg);
  }
  html {
    color-scheme: dark;
  }
  html:not(.dark) {
    color-scheme: light;
  }
}
```

- [ ] **Step 2: 初期テーマを dark に設定**

`index.html` の `<html>` に `class="dark"` を追加 (アプリ起動時に `useTheme` が上書きする前のチラつき防止)。`index.html` を開き `<html lang="ja">` を `<html lang="ja" class="dark">` に変更。

- [ ] **Step 3: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 4: 開発サーバーで目視確認**

Run: `pnpm dev` を起動し http://localhost:6123 を開く。
Expected: ダーク背景 (#070709)、Geist フォント、レイアウトは壊れていない (色はまだ古いコンポーネント由来で違和感あり得る)。確認後 Ctrl+C で停止。

- [ ] **Step 5: コミット**

```bash
git add src/styles.css index.html
git commit -m "style: rewrite design tokens for Technical Precision direction"
```

---

## Phase 2: 共通 UI コンポーネント variants

### Task 2.1: `Button` variants を新仕様に

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: `buttonVariants` を書き換え**

`src/components/ui/button.tsx` の `cva(...)` 呼び出しを以下に置換:

```tsx
const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:shadow-[var(--shadow-focus)] aria-invalid:ring-2 aria-invalid:ring-danger/40 aria-invalid:border-danger",
	{
		variants: {
			variant: {
				default:
					"bg-accent text-accent-fg hover:bg-accent-hi active:bg-accent-lo",
				destructive:
					"bg-danger text-white hover:bg-danger/90",
				outline:
					"border border-border-strong bg-transparent text-fg hover:bg-surface",
				secondary:
					"bg-surface text-fg border border-border hover:bg-raised",
				ghost:
					"bg-transparent text-muted hover:bg-surface hover:text-fg",
				"accent-ghost":
					"bg-transparent text-accent border border-[color:var(--accent-soft)] hover:bg-accent-soft",
				link: "text-accent underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5 text-[13px]",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);
```

`secondary` は旧仕様の background を再利用できるが、今後は `outline` を「枠のみ」として使い、`secondary` は surface 相当に位置づける。既存の呼び出し箇所が変わらないよう `variant` 名は維持。

- [ ] **Step 2: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/ui/button.tsx
git commit -m "refactor(ui): update Button variants for redesigned tokens"
```

---

### Task 2.2: `Card` のスタイル調整

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: `Card` root の className を更新**

`src/components/ui/card.tsx` の `Card` 関数の className を以下に置換 (他の CardHeader / CardContent 等は変更しない):

```tsx
className={cn(
  "bg-raised text-fg flex flex-col gap-6 rounded-lg border border-border py-6 shadow-sm",
  className,
)}
```

- [ ] **Step 2: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/ui/card.tsx
git commit -m "refactor(ui): switch Card to raised surface + redesigned radius"
```

---

### Task 2.3: `Dialog` overlay / content を更新

**Files:**
- Modify: `src/components/ui/dialog.tsx`

- [ ] **Step 1: `DialogOverlay` の className を更新**

`bg-black/50` を `bg-black/60 backdrop-blur-sm` に変更:

```tsx
className={cn(
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
  className,
)}
```

- [ ] **Step 2: `DialogContent` の className を更新**

`bg-background ... rounded-lg border p-6 shadow-lg` の行を以下に置換:

```tsx
className={cn(
  "bg-overlay border border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl p-6 shadow-[var(--shadow-lg)] duration-200 outline-none sm:max-w-lg",
  className,
)}
```

- [ ] **Step 3: 閉じるボタンを cyan focus ring に**

`DialogPrimitive.Close` の className 内 `focus:ring-ring` は残し、 `data-[state=open]:bg-accent` を `data-[state=open]:bg-surface` に変更 (accent カラーとの衝突回避)。

- [ ] **Step 4: 型チェック + コミット**

Run: `pnpm tsc -b`

```bash
git add src/components/ui/dialog.tsx
git commit -m "refactor(ui): restyle Dialog overlay and content"
```

---

### Task 2.4: `Switch` の track/thumb を更新

**Files:**
- Modify: `src/components/ui/switch.tsx`

- [ ] **Step 1: `SwitchPrimitive.Root` の className を書き換え**

```tsx
className={cn(
  "peer data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface border border-border focus-visible:shadow-[var(--shadow-focus)] inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50",
  className,
)}
```

- [ ] **Step 2: `SwitchPrimitive.Thumb` の className を書き換え**

```tsx
className={cn(
  "bg-fg data-[state=checked]:bg-accent-fg pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
)}
```

- [ ] **Step 3: 型チェック + コミット**

Run: `pnpm tsc -b`

```bash
git add src/components/ui/switch.tsx
git commit -m "refactor(ui): restyle Switch for redesigned palette"
```

---

### Task 2.5: `Skeleton` の色調整

**Files:**
- Modify: `src/components/ui/skeleton.tsx`

- [ ] **Step 1: className を `bg-accent` から `bg-raised` に変更**

```tsx
className={cn("bg-raised animate-pulse rounded-md", className)}
```

- [ ] **Step 2: 型チェック + コミット**

```bash
git add src/components/ui/skeleton.tsx
git commit -m "refactor(ui): switch Skeleton background to raised surface"
```

---

### Task 2.6: グローバルフォーカスリング・a11y

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: グローバル focus-visible を追加**

`src/styles.css` の `@layer base` ブロック末尾に追加:

```css
@layer base {
  /* ...existing rules above... */
  :focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
    border-radius: inherit;
  }
}
```

注: 既に Button 等の個別 variant で `focus-visible:shadow-[var(--shadow-focus)]` を指定しているため、ここでの設定は保険。テスト時に二重適用で問題がなければそのまま、問題があれば個別指定を優先。

- [ ] **Step 2: `pnpm dev` で目視確認**

Tab キーでフォーカス移動し、cyan リングが出ることを確認。

- [ ] **Step 3: コミット**

```bash
git add src/styles.css
git commit -m "style: add global cyan focus ring"
```

---

## Phase 3: テーマトグル + ヘッダー刷新

### Task 3.1: `useTheme` フックを作成 (TDD)

**Files:**
- Create: `src/hooks/use-theme.ts`
- Create: `src/hooks/use-theme.test.ts`

- [ ] **Step 1: 失敗テストを書く**

`src/hooks/use-theme.test.ts` を新規作成:

```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation((query: string) => ({
				matches: query === "(prefers-color-scheme: dark)",
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
	});

	it("defaults to 'dark' when no localStorage and OS prefers dark", () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("reads saved theme from localStorage", () => {
		localStorage.setItem("pdfpw-theme", "light");
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("toggles between light and dark", () => {
		const { result } = renderHook(() => useTheme());
		act(() => {
			result.current.toggleTheme();
		});
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(localStorage.getItem("pdfpw-theme")).toBe("light");
	});
});
```

- [ ] **Step 2: テストを実行して失敗確認**

Run: `pnpm test src/hooks/use-theme.test.ts`
Expected: FAIL ("Cannot find module ./use-theme" 等)

- [ ] **Step 3: 実装を書く**

`src/hooks/use-theme.ts` を新規作成:

```ts
import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pdfpw-theme";

function resolveInitialTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "dark" || stored === "light") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const setTheme = useCallback((next: Theme) => {
		window.localStorage.setItem(STORAGE_KEY, next);
		setThemeState(next);
	}, []);

	const toggleTheme = useCallback(() => {
		setThemeState((current) => {
			const next: Theme = current === "dark" ? "light" : "dark";
			window.localStorage.setItem(STORAGE_KEY, next);
			return next;
		});
	}, []);

	return { theme, setTheme, toggleTheme } as const;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm test src/hooks/use-theme.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: コミット**

```bash
git add src/hooks/use-theme.ts src/hooks/use-theme.test.ts
git commit -m "feat(theme): add useTheme hook with localStorage + media query"
```

---

### Task 3.2: `ThemeToggle` コンポーネント

**Files:**
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: 作成**

```tsx
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { Button } from "./ui/button";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === "dark";

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={toggleTheme}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			aria-pressed={isDark}
		>
			{isDark ? <SunIcon /> : <MoonIcon />}
		</Button>
	);
}
```

- [ ] **Step 2: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "feat(theme): add ThemeToggle button"
```

---

### Task 3.3: `Header.tsx` を 3 セクションに刷新

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: 全面置き換え**

```tsx
import { Link } from "@tanstack/react-router";
import { FileTextIcon, GithubIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
	return (
		<header className="flex items-center justify-between border-b border-border bg-bg px-6 py-3">
			<Link
				to="/"
				className="flex items-center gap-2 text-fg transition-opacity hover:opacity-80"
			>
				<span
					aria-hidden
					className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-accent text-accent-fg text-[11px] font-semibold"
				>
					+
				</span>
				<span className="text-[13px] font-semibold tracking-tight">pdfpw</span>
			</Link>

			<div className="flex items-center gap-1">
				<a
					href="https://github.com/pdfpw/pdfpw.github.io"
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
					aria-label="GitHub"
				>
					<GithubIcon className="size-4" />
				</a>
				<Link
					to="/licenses"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
					aria-label="Licenses"
				>
					<FileTextIcon className="size-4" />
				</Link>
				<ThemeToggle />
			</div>
		</header>
	);
}
```

- [ ] **Step 2: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 3: dev で目視確認**

Run: `pnpm dev` → ヘッダーのロゴ / GitHub / Licenses / テーマトグルが横一列に並ぶ。テーマトグルを押すとライト/ダーク切替。リロードしても状態が保持される。

- [ ] **Step 4: コミット**

```bash
git add src/components/Header.tsx
git commit -m "feat(header): redesign header with theme toggle and nav icons"
```

---

## Phase 4: ランディング画面 (情報設計刷新)

### Task 4.1: `HeroSection` を Editorial + Dropzone 統合版に作り直す

**Files:**
- Modify: `src/routes/(main)/-index/HeroSection.tsx` (全面書き換え)

- [ ] **Step 1: 既存の `HeroSection.tsx` をバックアップ用にファイル内容を確認**

Read `src/routes/(main)/-index/HeroSection.tsx` して現 props を把握 (`status: string | null` を受け取る)。

- [ ] **Step 2: 新 `HeroSection.tsx` を書く (Dropzone 機能を統合)**

```tsx
import { FileIcon, PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "#src/components/ui/button";

interface HeroSectionProps {
	status: string | null;
	inputId: string;
	supportsFSA: boolean;
	onOpenPicker: () => void;
	onFilesSelected: (files: File[]) => void;
}

export function HeroSection({
	status,
	inputId,
	supportsFSA,
	onOpenPicker,
	onFilesSelected,
}: HeroSectionProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragActive, setDragActive] = useState(false);

	function handleDrop(event: React.DragEvent) {
		event.preventDefault();
		setDragActive(false);
		const files = Array.from(event.dataTransfer.files);
		if (files.length > 0) onFilesSelected(files);
	}

	function handleDragOver(event: React.DragEvent) {
		event.preventDefault();
		if (!dragActive) setDragActive(true);
	}

	function handleDragLeave() {
		setDragActive(false);
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = event.target.files ? Array.from(event.target.files) : [];
		if (files.length > 0) onFilesSelected(files);
		event.target.value = "";
	}

	return (
		<section className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
			<div className="flex flex-col justify-center">
				<div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
					PRESENTER CONSOLE / 001
				</div>
				<h1 className="mb-5 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl lg:text-[56px]">
					Precise by
					<br />
					default.
				</h1>
				<p className="mb-8 max-w-[42ch] text-[13px] leading-[1.6] text-muted">
					A browser-based presenter console. No install, no cloud upload.
					Your PDF stays on your device.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="default"
						size="default"
						onClick={() => inputRef.current?.click()}
					>
						<PlusIcon className="size-4" />
						Open PDF
					</Button>
					{supportsFSA && (
						<Button
							type="button"
							variant="secondary"
							size="default"
							onClick={onOpenPicker}
						>
							Open with File System Access
						</Button>
					)}
				</div>
				{status && (
					<p className="mt-6 text-[12px] text-muted" role="status">
						{status}
					</p>
				)}
			</div>

			{/* Dropzone */}
			<label
				htmlFor={inputId}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
					dragActive
						? "border-accent bg-accent-soft"
						: "border-accent/50 bg-accent-soft/60 hover:bg-accent-soft"
				}`}
			>
				<span
					aria-hidden
					className="flex size-12 items-center justify-center rounded-lg border border-dashed border-accent/70 text-accent"
				>
					<FileIcon className="size-5" />
				</span>
				<span className="text-[13px] font-medium text-accent">
					Drop a PDF here
				</span>
				<span className="font-mono text-[11px] text-muted">
					or click to browse &middot; <kbd>⌘O</kbd>
				</span>
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept=".pdf,.pdfpc,application/pdf"
					multiple
					onChange={handleFileChange}
					className="sr-only"
				/>
			</label>
		</section>
	);
}
```

- [ ] **Step 3: 型チェック**

Run: `pnpm tsc -b`
Expected: 既存の HeroSection 呼び出し側 (index.tsx) で新 props が未指定のため型エラーが出る → 次タスクで解消するので、一旦このファイル単体で型エラーがないかだけ確認。`index.tsx` 側は次タスクで合わせて修正。

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/-index/HeroSection.tsx
git commit -m "feat(landing): rebuild HeroSection as editorial split with dropzone"
```

---

### Task 4.2: `DropzoneSection.tsx` を削除 (HeroSection に統合済み)

**Files:**
- Delete: `src/routes/(main)/-index/DropzoneSection.tsx`

- [ ] **Step 1: 削除**

```bash
git rm src/routes/\(main\)/-index/DropzoneSection.tsx
```

- [ ] **Step 2: 呼び出し側 (index.tsx) のインポートは次タスクで削除**

一旦コミットせず、次タスクでまとめてコミット。

---

### Task 4.3: `RecentSection` → `LibrarySection` にリネーム + 刷新

**Files:**
- Rename: `src/routes/(main)/-index/RecentSection.tsx` → `src/routes/(main)/-index/LibrarySection.tsx`
- Rename: `src/routes/(main)/-index/RecentSectionData.tsx` → `src/routes/(main)/-index/LibrarySectionData.tsx`

- [ ] **Step 1: 既存ファイルの内容を Read**

Read `src/routes/(main)/-index/RecentSection.tsx` と `RecentSectionData.tsx` で公開コンポーネント名 (`RecentSection`, `RecentSectionLoading`, `RecentSectionData`) と props を確認。

- [ ] **Step 2: git mv でリネーム**

```bash
git mv src/routes/\(main\)/-index/RecentSection.tsx src/routes/\(main\)/-index/LibrarySection.tsx
git mv src/routes/\(main\)/-index/RecentSectionData.tsx src/routes/\(main\)/-index/LibrarySectionData.tsx
```

- [ ] **Step 3: ファイル内でのコンポーネント名置換**

`LibrarySection.tsx` 内の `RecentSection` → `LibrarySection`、`RecentSectionLoading` → `LibrarySectionLoading` に全置換。`LibrarySectionData.tsx` 内も同様に `RecentSectionData` → `LibrarySectionData`、import 先のファイル名 `./RecentSection` → `./LibrarySection` に置換。

- [ ] **Step 4: `LibrarySection` 内のスタイルを新仕様に**

既存のルート要素 (セクション全体をラップする `<section>` や `<div>`) に新デザインを反映:

- セクションヘッダーに `LIBRARY` (mono uppercase label) + ファイル数 + 履歴保存 Switch + Clear All ボタン
- カードグリッドは `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`
- 各カードは `rounded-lg border border-border bg-raised p-2.5` + aspect-[4/3] のサムネ領域 (`bg-gradient-to-br from-raised to-surface` で仮) + ファイル名 + Mono メタ

具体的な書き換え差分は既存ファイル構造による。`RecentSection` のコンポーネントは既存 props を維持 (`recentFiles`, `settings`, `onToggleHistory`, `onClearRecent`, `onRecentClick`, `onDeleteRecent`, `supportsFSA`) し、見た目だけ刷新する。セクションタイトルと空状態メッセージを以下に変更:

- タイトル: `LIBRARY` (font-mono text-[10px] uppercase tracking-[0.14em] text-muted)
- サブタイトル: `{N} files · recent first` (text-[11px] text-subtle)
- 空状態: "No recent files yet. Drop a PDF above to start." (text-muted text-center py-8)

- [ ] **Step 5: 型チェック**

Run: `pnpm tsc -b`
Expected: 呼び出し側 (index.tsx) で旧名 import が型エラー → 次タスクで解消。

- [ ] **Step 6: コミット** (次タスクまで保留。このタスクはまだ commit しない)

---

### Task 4.4: `HowItWorksSection` を新規作成

**Files:**
- Create: `src/routes/(main)/-index/HowItWorksSection.tsx`

- [ ] **Step 1: 作成**

```tsx
import {
	FileTextIcon,
	KeyboardIcon,
	MonitorPlayIcon,
} from "lucide-react";

interface Step {
	number: string;
	icon: React.ReactNode;
	title: string;
	body: string;
}

const STEPS: Step[] = [
	{
		number: "01",
		icon: <FileTextIcon className="size-5 text-accent" />,
		title: "Open a PDF in your browser",
		body:
			"No install, no cloud upload. Your file stays on your device. pdfpc configuration files are supported.",
	},
	{
		number: "02",
		icon: <MonitorPlayIcon className="size-5 text-accent" />,
		title: "Pop out the presentation",
		body:
			"Two synchronized windows: a private presenter console with notes and timer, plus a public fullscreen display.",
	},
	{
		number: "03",
		icon: <KeyboardIcon className="size-5 text-accent" />,
		title: "Present with confidence",
		body:
			"Notes, timer, laser pointer, pen, blackout — all keyboard-driven. Stay in flow.",
	},
];

export function HowItWorksSection() {
	return (
		<section className="border-t border-border">
			<div className="container mx-auto max-w-6xl px-6 py-12">
				<div className="mb-6 flex items-baseline justify-between">
					<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						HOW IT WORKS
					</div>
					<div className="text-[11px] text-subtle">3 steps</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{STEPS.map((step) => (
						<article
							key={step.number}
							className="flex flex-col rounded-lg border border-border bg-raised p-5"
						>
							<div className="mb-3 flex items-center justify-between">
								<span className="font-mono text-[11px] font-semibold text-accent">
									{step.number}
								</span>
								{step.icon}
							</div>
							<h3 className="mb-2 text-[15px] font-medium tracking-tight text-fg">
								{step.title}
							</h3>
							<p className="text-[13px] leading-[1.55] text-muted">
								{step.body}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
```

- [ ] **Step 2: 型チェック**

Run: `pnpm tsc -b`
Expected: HowItWorksSection 単体は OK、呼び出し側の問題は次タスクで解消。

---

### Task 4.5: `index.tsx` を新 3 セクションで組み直す

**Files:**
- Modify: `src/routes/(main)/index.tsx`

- [ ] **Step 1: imports を修正**

`src/routes/(main)/index.tsx` のトップ付近を以下に置換:

```tsx
import { DropzoneSection } from "./-index/DropzoneSection"; // 削除
import { HeroSection } from "./-index/HeroSection";
import { RecentSection, RecentSectionLoading } from "./-index/RecentSection"; // 削除
import { RecentSectionData } from "./-index/RecentSectionData"; // 削除
```

これを:

```tsx
import { HeroSection } from "./-index/HeroSection";
import { HowItWorksSection } from "./-index/HowItWorksSection";
import {
	LibrarySection,
	LibrarySectionLoading,
} from "./-index/LibrarySection";
import { LibrarySectionData } from "./-index/LibrarySectionData";
```

- [ ] **Step 2: `Home()` の return を書き換え**

旧 return (304 行目付近から) を以下に差し替え:

```tsx
return (
	<main className="bg-bg text-fg">
		<div className="container mx-auto max-w-6xl px-6 pt-12 pb-14">
			<HeroSection
				status={status}
				inputId={inputId}
				supportsFSA={supportsFSA}
				onOpenPicker={onOpenPicker}
				onFilesSelected={onFilesSelected}
			/>
		</div>

		<div className="border-t border-border">
			{supportsFSA ? (
				<Suspense fallback={<LibrarySectionLoading />}>
					<LibrarySectionData
						recentFilesPromise={recentFilesPromise}
						settings={{ saveHistory }}
						onToggleHistory={toggleHistory}
						onClearRecent={clearRecent}
						onRecentClick={onRecentClick}
						onDeleteRecent={deleteRecent}
					/>
				</Suspense>
			) : (
				<LibrarySection
					supportsFSA={false}
					recentFiles={[]}
					settings={{ saveHistory }}
					onToggleHistory={toggleHistory}
					onClearRecent={() => {}}
					onRecentClick={async () => {}}
					onDeleteRecent={async () => {}}
				/>
			)}
		</div>

		<HowItWorksSection />
	</main>
);
```

- [ ] **Step 3: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 4: dev で目視確認**

Run: `pnpm dev` → ランディングが Hero (editorial split) + Library + How it works の 3 セクション縦積みで表示される。Dropzone の drag/drop が機能、Library の履歴保存 Switch が機能。

- [ ] **Step 5: Phase 4 全体をコミット**

```bash
git add -A src/routes/\(main\)/index.tsx src/routes/\(main\)/-index/
git commit -m "feat(landing): reorganize landing into editorial hero + library + how-it-works"
```

---

## Phase 5: プレゼンター画面 (ビジュアル刷新)

> 3 エリア grid 構造は**変更しない**。視覚処理のみ更新。

### Task 5.1: presenter.tsx ルートの面 (surface) 調整

**Files:**
- Modify: `src/routes/(main)/presenter.tsx`

- [ ] **Step 1: 該当行を確認**

Read `src/routes/(main)/presenter.tsx` で main コンテナ (`grid-template-columns`, `grid-template-rows` が定義されている行) とヘッダー行を確認。

- [ ] **Step 2: ルート div のクラスを更新**

`grid` を持つ最外周のクラスを以下のように変更:

- 背景は `bg-bg`
- gap は `gap-3` (12px) または `gap-4` (16px) をそのまま
- padding は既存のものを踏襲 (`p-4` 等)

- [ ] **Step 3: 型チェック + dev 目視**

Run: `pnpm tsc -b` / `pnpm dev` → レイアウト崩れなし。

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/presenter.tsx
git commit -m "style(presenter): update root surface to new bg token"
```

---

### Task 5.2: `SlideStage` / `NextSlide` をカード化

**Files:**
- Modify: `src/routes/(main)/-presenter/SlideStage.tsx`
- Modify: `src/routes/(main)/-presenter/NextSlide.tsx`

- [ ] **Step 1: `SlideStage` のラッパークラスを更新**

`SlideStage.tsx` の最外周 `<div>` のクラスに以下を適用:

```
bg-raised border border-border rounded-lg overflow-hidden relative
```

内部の PdfPage + PointerOverlay はそのまま。ラッパー左下にページ番号を表示する小さな span を追加:

```tsx
<span className="pointer-events-none absolute bottom-2.5 left-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
	SLIDE {currentPage} / {totalPages}
</span>
```

`currentPage` / `totalPages` は `src/routes/(main)/-presenter/state.ts` (Jotai atoms) から取得する。既存の presenter.tsx でこれらの値がどう使われているかを読み、同じ atom を `useAtomValue` で SlideStage 内から参照する。props で受け取る形にしたい場合は presenter.tsx から渡す形でも可。

- [ ] **Step 2: `NextSlide` のラッパーを同様にカード化**

```
bg-raised border border-border rounded-lg p-2.5
```

内部にラベル `NEXT · N / M` を font-mono text-[10px] uppercase tracking-[0.12em] text-muted で先頭に表示。

- [ ] **Step 3: 型チェック + dev 目視**

Run: `pnpm tsc -b` / `pnpm dev` → プレゼンター画面でスライドエリアと次スライドがカード枠で区切られる。

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/-presenter/SlideStage.tsx src/routes/\(main\)/-presenter/NextSlide.tsx
git commit -m "style(presenter): wrap SlideStage and NextSlide as raised cards"
```

---

### Task 5.3: `ModeForm` の active 表示刷新

**Files:**
- Modify: `src/routes/(main)/-presenter/ModeForm.tsx`

- [ ] **Step 1: ボタンを Button コンポーネントに統一 (既存で使っていれば variant のみ変更)**

`ModeForm.tsx` の各ボタンは既存 `Button` を使っていると想定。active 時のクラスを以下で表現:

```tsx
<Button
  variant={isFrozen ? "accent-ghost" : "ghost"}
  size="icon"
  aria-pressed={isFrozen}
  onClick={toggleFreeze}
>
  <SnowflakeIcon className="size-4" />
</Button>
```

非 active は `ghost`、active は `accent-ghost` (cyan 枠 + cyan text)。同様に blackout / overview / pointer ボタンも個別 variant を設定。

- [ ] **Step 2: 外側コンテナを raised surface に**

`ModeForm` 最外周を:

```
bg-raised border border-border rounded-lg p-2 flex gap-2
```

に。

- [ ] **Step 3: 型チェック + dev 目視**

Run: `pnpm tsc -b` / `pnpm dev` → トグル時に cyan で状態が明確に分かる。

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/-presenter/ModeForm.tsx
git commit -m "style(presenter): highlight active mode buttons with cyan accent"
```

---

### Task 5.4: `Note` パネルのスタイル刷新

**Files:**
- Modify: `src/routes/(main)/-presenter/Note.tsx`

- [ ] **Step 1: ラッパーを raised card に**

既存の Card 使用箇所がある場合は className を追加し、なければ最外周を以下に:

```
bg-raised border border-border rounded-lg p-4 overflow-y-auto
```

- [ ] **Step 2: prose 調整**

Note 本文 (markdown) の wrapper に `prose prose-sm dark:prose-invert max-w-none` を維持。text 色は継承。見出しの font-mono ラベル `NOTES` を上部に追加:

```tsx
<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
	NOTES
</div>
```

- [ ] **Step 3: 型チェック + dev 目視**

Run: `pnpm tsc -b` / `pnpm dev` → ノート見出しが出て、本文が raised 面に読みやすく表示。

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/-presenter/Note.tsx
git commit -m "style(presenter): give Notes panel a raised card treatment"
```

---

### Task 5.5: `NextPrevFooter` + `Timer` の刷新

**Files:**
- Modify: `src/routes/(main)/-presenter/NextPrevFooter.tsx`
- Modify: `src/routes/(main)/-presenter/Timer.tsx`

- [ ] **Step 1: Footer 外側を card 化**

`NextPrevFooter.tsx` の最外周を:

```
bg-raised border border-border rounded-lg px-4 py-3 flex items-center gap-4
```

Prev/Next サムネはそのまま、中央の Prev/Next ボタン + ページ番号 + Timer の並びを維持。

- [ ] **Step 2: Timer 色表示を新トークンで確認**

`Timer.tsx` で使われている Tailwind ユーティリティ (`text-timer-pretalk` 等) が Phase 1 で追加済みの `--color-timer-*` に正しく解決することを確認。既存の変数名は維持したので、そのまま動くはず。

- [ ] **Step 3: 型チェック + dev 目視**

Run: `pnpm tsc -b` / `pnpm dev` → フッターがカード化、Timer の色分けが新しい success/info/warning/danger で表示。

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/-presenter/NextPrevFooter.tsx src/routes/\(main\)/-presenter/Timer.tsx
git commit -m "style(presenter): card-ify footer and verify timer color bridging"
```

---

## Phase 6: プレゼンテーション画面

### Task 6.1: Floating Menu スタイル

**Files:**
- Modify: `src/routes/presentation/-Menu.tsx`

- [ ] **Step 1: Menu の className を置換**

既存のメニュー root を以下のスタイルに:

```
fixed bottom-6 left-1/2 -translate-x-1/2
flex items-center gap-3
rounded-[10px] border border-border
bg-overlay/90 backdrop-blur-md
px-3 py-2
shadow-[var(--shadow-lg)]
```

内部のページ番号表示を `font-mono text-[11px] text-fg` に、フルスクリーンボタンは Button `ghost size-icon-sm` に。2.5 秒の自動隠蔽ロジックは一切変更しない。

- [ ] **Step 2: 型チェック + 目視**

Run: `pnpm tsc -b`、`pnpm dev` → プレゼンテーション画面の下部中央に floating bar が出る。

- [ ] **Step 3: コミット**

```bash
git add src/routes/presentation/-Menu.tsx
git commit -m "style(presentation): redesign floating menu bar"
```

---

### Task 6.2: `OverviewDialog` サムネグリッド刷新

**Files:**
- Modify: `src/components/OverviewDialog.tsx`
- Modify: `src/components/OverviewThumbnail.tsx`

- [ ] **Step 1: `OverviewDialog` の内部を刷新**

Dialog は共通 UI (Phase 2.3 で overlay 更新済み) を使う。内部のタイトル + グリッドを:

- ヘッダー: `OVERVIEW` (font-mono uppercase label)
- グリッド: `grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 max-h-[70vh] overflow-y-auto`

- [ ] **Step 2: `OverviewThumbnail` の選択状態を cyan ボーダーに**

現状の選択状態表示のクラスを:

```
ring-2 ring-accent ring-offset-2 ring-offset-overlay
```

に変更 (選択時にのみ適用)。

- [ ] **Step 3: 型チェック + 目視**

Run: `pnpm tsc -b`、`pnpm dev` → Tab でオーバービューを開き、選択中ページが cyan 枠で示される。

- [ ] **Step 4: コミット**

```bash
git add src/components/OverviewDialog.tsx src/components/OverviewThumbnail.tsx
git commit -m "style(presentation): restyle overview dialog with cyan selected state"
```

---

## Phase 7: 最終確認

### Task 7.1: 全画面の視覚確認

**Files:** 変更なし (手動確認)

- [ ] **Step 1: dev サーバー起動**

Run: `pnpm dev`

- [ ] **Step 2: 4 画面をダーク / ライトで順に確認**

確認項目:
- **ランディング (ダーク)** — Hero + Library + How it works が縦に並ぶ
- **ランディング (ライト)** — テーマトグルで切替、コントラストが取れている
- **プレゼンター (ダーク)** — 3 エリア + Footer がカード化、cyan が active 状態を示す
- **プレゼンター (ライト)** — 同上、ライト時もレイアウト維持
- **プレゼンテーション (ダーク/ライト)** — フルスクリーン slide + floating menu、Overview ダイアログ
- **ライセンス画面** — 既存 `licenses.tsx` もヘッダーを介して表示されるため、新ヘッダーで崩れていないか確認

Tab キーでフォーカスが cyan リングで見える。テーマトグルが動作、リロード後も維持。

- [ ] **Step 3: 発見した破綻があれば個別タスクを追加**

`TaskCreate` で "visual fix: [箇所]" を追加。以降の各タスクで順次修正してコミット。

---

### Task 7.2: ビルド / lint / test 通過確認

- [ ] **Step 1: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 2: lint**

Run: `pnpm check`
Expected: エラーなし (format / lint 両方)

- [ ] **Step 3: テスト**

Run: `pnpm test`
Expected: 全テスト PASS (新規の `use-theme.test.ts` 含む)

- [ ] **Step 4: 本番ビルド**

Run: `pnpm build`
Expected: 成功

- [ ] **Step 5: プレビュー確認**

Run: `pnpm preview` → ビルド成果物をブラウザで軽く確認。

---

### Task 7.3: PR 準備

- [ ] **Step 1: ブランチを切って push 準備**

本計画は複数フェーズで進むため、作業は一貫して同一ブランチで進め、計画完了時に一括 PR 化する。最終コミット後:

```bash
git log --oneline main..HEAD  # 変更範囲確認
```

- [ ] **Step 2: PR 作成 (ユーザーの承認後)**

ユーザーに「PR を作成してよいか」を確認してから `gh pr create` を実行。

---

## 実装中のルール

- **TDD はロジック変更箇所のみ適用**: `useTheme` のみテスト対象。他は視覚中心のため目視確認ベース。
- **各タスク完了時にコミット**: 途中で壊れても直前に戻せるように。
- **3 エリア grid 構造は触らない**: presenter.tsx の `grid-template-columns` / `grid-template-rows` を変更するタスクは本計画に存在しない。万一変更が必要と感じたらユーザーに確認。
- **broadcast / PDF レンダリング / ナビゲーションロジックは触らない**: 視覚のみ。
- **既存のクエリ検証 / idb / FSA ロジックは一切変更しない**: Phase 4 の landing 再編でも、既存の `handleFiles`, `onOpenPicker`, `saveRecent` 等は触らず、呼び出し側の JSX 構造のみ変更する。

## 既知の未決事項

- HowItWorksSection の本文は暫定案。必要に応じて文言調整。
- HeroSection 大見出し `Precise by / default.` は暫定コピー。実装後にユーザーと再検討。
- FSA 非対応ブラウザの `Browse` ボタン文言 → HeroSection 内では条件分岐で `Open with FSA` を出さないだけで、`Open PDF` はどちらでも表示される (file input を開く)。
- ロゴは暫定 (cyan の角丸 `+` アイコン + "pdfpw" テキスト)。必要に応じて後続で差し替え。
