# キーバインドヘルプ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ショートカットキーの存在をユーザーに発見可能にする。`?` / `F1` でヘルプダイアログを開き、`KEYBINDING_CATALOG` レジストリから自動的に全ショートカットを表示する。既存の3つのショートカットフックは内部で同レジストリを参照する形にリファクタする。

**Architecture:** `src/lib/keybindings.ts` に単一ソースの `KEYBINDING_CATALOG` を定義し、`matchAction(event, scope)` で `KeyboardEvent` を `ActionId` に解決する。既存フックは `event.key` のハードコード分岐を `matchAction` 経由のディスパッチに書き換える (公開 API は維持)。ヘルプ UI は Radix Dialog ベース、初回トーストは `localStorage` で永続化。発見性のため Header (presenter) と floating Menu (presentation) に `?` アイコンボタンを追加。

**Tech Stack:** React 19, Jotai, TanStack Router, TypeScript (strict), Radix UI Dialog, Tailwind v4, vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-04-25-keybinding-help-design.md`

---

## ファイル構造

**新規**:
- `src/lib/keybindings.ts` — `ActionId` / `Scope` / `Category` / `Binding` / `KEYBINDING_CATALOG` / `matchAction` / `matchBinding` / `humanizeKey`
- `src/lib/keybindings.test.ts` — `matchAction` と `matchBinding` のユニットテスト
- `src/components/ui/kbd.tsx` — キーキャップ風表示
- `src/components/KeybindingHelpDialog.tsx` — ヘルプダイアログ
- `src/components/KeybindingHintToast.tsx` — 初回ヒントトースト
- `src/hooks/use-keybinding-help.ts` — open/close 状態 + `?`/`F1` 監視 + localStorage
- `src/hooks/use-keybinding-help.test.ts` — フックのユニットテスト
- `src/routes/presentation/-hooks/use-presentation-view-shortcut.ts` — `f` (fullscreen) / `Tab` (overview) / `Esc` (close overview)

**修正**:
- `src/routes/-hooks/use-slide-shortcut.ts` — `matchAction` 経由のディスパッチへ書き換え
- `src/routes/-hooks/use-tool-shortcut.ts` — `matchAction` 経由 (引数 `selfSide` を `Scope` として使用)
- `src/routes/presentation/-hooks/use-presentation-shortcut.ts` — `matchAction` 経由
- `src/routes/presentation/index.tsx` — インライン `keydown` を `use-presentation-view-shortcut` に置換、ヘルプ統合
- `src/routes/presentation/-Menu.tsx` — floating menu に `?` ボタン追加
- `src/components/Header.tsx` — オプショナル `onHelpClick` プロップで `?` ボタン表示
- `src/routes/(main)/presenter.tsx` — `useKeybindingHelp` 接続、HelpDialog/HintToast マウント、Header に onHelpClick 渡す

---

## Task 1: キーバインドレジストリと matchAction の作成 (TDD)

**Files:**
- Create: `src/lib/keybindings.ts`
- Test: `src/lib/keybindings.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/keybindings.test.ts` を作成:

```ts
import { describe, expect, it } from "vitest";
import {
	humanizeKey,
	KEYBINDING_CATALOG,
	matchAction,
	matchBinding,
} from "./keybindings.ts";

const makeEvent = (init: Partial<KeyboardEvent>): KeyboardEvent =>
	new KeyboardEvent("keydown", {
		key: init.key,
		shiftKey: init.shiftKey ?? false,
		ctrlKey: init.ctrlKey ?? false,
		altKey: init.altKey ?? false,
		metaKey: init.metaKey ?? false,
	});

describe("matchBinding", () => {
	it("単一文字は大文字小文字を問わずマッチ", () => {
		expect(matchBinding(makeEvent({ key: "L" }), { key: "l" })).toBe(true);
		expect(matchBinding(makeEvent({ key: "l" }), { key: "l" })).toBe(true);
	});

	it("特殊キー名は完全一致のみ", () => {
		expect(
			matchBinding(makeEvent({ key: "ArrowRight" }), { key: "ArrowRight" }),
		).toBe(true);
		expect(
			matchBinding(makeEvent({ key: "Right" }), { key: "ArrowRight" }),
		).toBe(false);
	});

	it("修飾キーは完全一致 (shift 必須)", () => {
		expect(
			matchBinding(makeEvent({ key: "ArrowRight", shiftKey: true }), {
				key: "ArrowRight",
				shift: true,
			}),
		).toBe(true);
		// shift なしで shift 必須バインディングは不一致
		expect(
			matchBinding(makeEvent({ key: "ArrowRight" }), {
				key: "ArrowRight",
				shift: true,
			}),
		).toBe(false);
		// shift あり + shift 不要バインディングも不一致
		expect(
			matchBinding(makeEvent({ key: "ArrowRight", shiftKey: true }), {
				key: "ArrowRight",
			}),
		).toBe(false);
	});

	it("ctrl / alt / meta も完全一致", () => {
		expect(
			matchBinding(makeEvent({ key: "a", ctrlKey: true }), { key: "a" }),
		).toBe(false);
		expect(
			matchBinding(makeEvent({ key: "a", ctrlKey: true }), {
				key: "a",
				ctrl: true,
			}),
		).toBe(true);
	});
});

describe("matchAction", () => {
	it("scope=presenter で presenter 限定キー (r) がマッチ", () => {
		const action = matchAction(makeEvent({ key: "r" }), "presenter");
		expect(action).toBe("system.reset-timer");
	});

	it("scope=presentation で presenter 限定キー (r) は null", () => {
		const action = matchAction(makeEvent({ key: "r" }), "presentation");
		expect(action).toBeNull();
	});

	it("scope=presentation で presentation 限定キー (f) がマッチ", () => {
		const action = matchAction(makeEvent({ key: "f" }), "presentation");
		expect(action).toBe("view.fullscreen");
	});

	it("両画面共通キー (l) は両 scope でマッチ", () => {
		expect(matchAction(makeEvent({ key: "l" }), "presenter")).toBe(
			"tool.laser",
		);
		expect(matchAction(makeEvent({ key: "l" }), "presentation")).toBe(
			"tool.laser",
		);
	});

	it("Shift+ArrowRight は slide.next-10、ArrowRight は slide.next", () => {
		expect(matchAction(makeEvent({ key: "ArrowRight" }), "presenter")).toBe(
			"slide.next",
		);
		expect(
			matchAction(
				makeEvent({ key: "ArrowRight", shiftKey: true }),
				"presenter",
			),
		).toBe("slide.next-10");
	});

	it("? と F1 は system.help にマッチ", () => {
		expect(matchAction(makeEvent({ key: "?" }), "presenter")).toBe(
			"system.help",
		);
		expect(matchAction(makeEvent({ key: "F1" }), "presentation")).toBe(
			"system.help",
		);
	});

	it("未定義キーは null", () => {
		expect(matchAction(makeEvent({ key: "z" }), "presenter")).toBeNull();
	});
});

describe("KEYBINDING_CATALOG", () => {
	it("全 action に bindings が1件以上ある", () => {
		for (const [actionId, def] of Object.entries(KEYBINDING_CATALOG)) {
			expect(def.bindings.length, `${actionId} has bindings`).toBeGreaterThan(
				0,
			);
		}
	});
});

describe("humanizeKey", () => {
	it("特殊キーを記号化", () => {
		expect(humanizeKey("ArrowRight")).toBe("→");
		expect(humanizeKey("ArrowLeft")).toBe("←");
		expect(humanizeKey("ArrowUp")).toBe("↑");
		expect(humanizeKey("ArrowDown")).toBe("↓");
		expect(humanizeKey(" ")).toBe("Space");
		expect(humanizeKey("PageDown")).toBe("PgDn");
		expect(humanizeKey("PageUp")).toBe("PgUp");
		expect(humanizeKey("Escape")).toBe("Esc");
	});

	it("単一文字は大文字化", () => {
		expect(humanizeKey("l")).toBe("L");
		expect(humanizeKey("?")).toBe("?");
	});

	it("未知のキーはそのまま", () => {
		expect(humanizeKey("F1")).toBe("F1");
		expect(humanizeKey("Home")).toBe("Home");
	});
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
pnpm test src/lib/keybindings.test.ts
```

Expected: FAIL (`./keybindings.ts` が存在しないため import エラー)

- [ ] **Step 3: 実装を書く**

`src/lib/keybindings.ts` を作成:

```ts
export type ActionId =
	// navigation
	| "slide.next"
	| "slide.prev"
	| "slide.next-user"
	| "slide.prev-user"
	| "slide.next-10"
	| "slide.prev-10"
	| "slide.first"
	| "slide.last"
	| "slide.history-back"
	| "slide.jump-mode"
	// tools
	| "tool.laser"
	| "tool.pen"
	| "tool.erase"
	| "tool.exit"
	// view
	| "view.overview"
	| "view.fullscreen"
	// system
	| "system.reset-timer"
	| "system.help";

export type Scope = "presenter" | "presentation" | "both";
export type Category = "navigation" | "tools" | "view" | "system";

export interface Binding {
	/** KeyboardEvent.key の値 (単一文字キーは小文字で記述) */
	readonly key: string;
	readonly shift?: boolean;
	readonly ctrl?: boolean;
	readonly alt?: boolean;
	readonly meta?: boolean;
}

export interface ActionDefinition {
	readonly category: Category;
	readonly scope: Scope;
	readonly bindings: readonly Binding[];
	readonly label: string;
	readonly hint?: string;
}

export const KEYBINDING_CATALOG: Record<ActionId, ActionDefinition> = {
	// navigation
	"slide.next-10": {
		category: "navigation",
		scope: "presenter",
		bindings: [
			{ key: "ArrowRight", shift: true },
			{ key: "PageDown", shift: true },
		],
		label: "Skip 10 forward",
	},
	"slide.prev-10": {
		category: "navigation",
		scope: "presenter",
		bindings: [
			{ key: "ArrowLeft", shift: true },
			{ key: "PageUp", shift: true },
		],
		label: "Skip 10 backward",
	},
	"slide.next": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "ArrowRight" }, { key: " " }, { key: "PageDown" }],
		label: "Next slide",
	},
	"slide.prev": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "ArrowLeft" }, { key: "PageUp" }],
		label: "Previous slide",
	},
	"slide.next-user": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "ArrowDown" }],
		label: "Next slide group",
	},
	"slide.prev-user": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "ArrowUp" }],
		label: "Previous slide group",
	},
	"slide.first": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "Home" }],
		label: "First slide",
	},
	"slide.last": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "End" }],
		label: "Last slide",
	},
	"slide.history-back": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "Backspace" }],
		label: "Navigate back in history",
	},
	"slide.jump-mode": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "g" }],
		label: "Jump to slide N",
		hint: "Then type digits and press Enter",
	},
	// tools
	"tool.laser": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "l" }],
		label: "Toggle laser pointer",
	},
	"tool.pen": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "d" }],
		label: "Toggle pen",
	},
	"tool.erase": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "e" }],
		label: "Erase pen drawings",
	},
	"tool.exit": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "Escape" }],
		label: "Exit tool / close dialog",
	},
	// view
	"view.overview": {
		category: "view",
		scope: "both",
		bindings: [{ key: "Tab" }],
		label: "Toggle overview",
	},
	"view.fullscreen": {
		category: "view",
		scope: "presentation",
		bindings: [{ key: "f" }],
		label: "Toggle fullscreen",
	},
	// system
	"system.reset-timer": {
		category: "system",
		scope: "presenter",
		bindings: [{ key: "r" }],
		label: "Reset timer",
	},
	"system.help": {
		category: "system",
		scope: "both",
		bindings: [{ key: "?" }, { key: "F1" }],
		label: "Show keyboard help",
	},
};

export function matchBinding(event: KeyboardEvent, binding: Binding): boolean {
	const eventKey =
		event.key.length === 1 ? event.key.toLowerCase() : event.key;
	const bindingKey =
		binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
	if (eventKey !== bindingKey) return false;
	if (!!binding.shift !== event.shiftKey) return false;
	if (!!binding.ctrl !== event.ctrlKey) return false;
	if (!!binding.alt !== event.altKey) return false;
	if (!!binding.meta !== event.metaKey) return false;
	return true;
}

export function matchAction(
	event: KeyboardEvent,
	scope: "presenter" | "presentation",
): ActionId | null {
	for (const [actionId, def] of Object.entries(KEYBINDING_CATALOG)) {
		if (def.scope !== "both" && def.scope !== scope) continue;
		for (const binding of def.bindings) {
			if (matchBinding(event, binding)) return actionId as ActionId;
		}
	}
	return null;
}

const HUMAN_KEY_MAP: Record<string, string> = {
	ArrowRight: "→",
	ArrowLeft: "←",
	ArrowUp: "↑",
	ArrowDown: "↓",
	" ": "Space",
	PageDown: "PgDn",
	PageUp: "PgUp",
	Escape: "Esc",
};

export function humanizeKey(key: string): string {
	if (key in HUMAN_KEY_MAP) return HUMAN_KEY_MAP[key];
	if (key.length === 1) return key.toUpperCase();
	return key;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
pnpm test src/lib/keybindings.test.ts
```

Expected: PASS (全テスト緑)

- [ ] **Step 5: 型チェックと lint**

```bash
pnpm tsc -b && pnpm check
```

Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/lib/keybindings.ts src/lib/keybindings.test.ts
git commit -m "feat(keybindings): キーバインドレジストリと matchAction を追加"
```

---

## Task 2: Kbd UI コンポーネント

**Files:**
- Create: `src/components/ui/kbd.tsx`

- [ ] **Step 1: 実装**

`src/components/ui/kbd.tsx` を作成:

```tsx
import type * as React from "react";
import { cn } from "#src/lib/utils.ts";

export function Kbd({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	return (
		<kbd
			className={cn(
				"inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border bg-raised px-1.5 py-0.5 font-mono text-[12px] font-medium text-fg leading-none shadow-[0_1px_0_rgba(0,0,0,0.4)]",
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
}
```

- [ ] **Step 2: 型チェックと lint**

```bash
pnpm tsc -b && pnpm check
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/ui/kbd.tsx
git commit -m "feat(ui): キーキャップ表示用 Kbd コンポーネントを追加"
```

---

## Task 3: use-slide-shortcut を matchAction 経由に書き換え

**Files:**
- Modify: `src/routes/-hooks/use-slide-shortcut.ts`

- [ ] **Step 1: switch を action ID ベースに置換**

`src/routes/-hooks/use-slide-shortcut.ts` の `handleKeyDown` を以下に置換:

```ts
import { type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { matchAction } from "#src/lib/keybindings.ts";

interface NavigationCallbacks {
	moveNextSlide: () => void;
	movePrevSlide: () => void;
	moveNext10Slides: () => void;
	movePrev10Slides: () => void;
	jumpToFirstSlide: () => void;
	jumpToLastSlide: () => void;
	moveNextUserSlide: () => void;
	movePrevUserSlide: () => void;
	startJumpToSlide: () => void;
	jumpToSlide?: (slideNumber: number) => void;
	goBackInHistory: () => void;
	toggleOverviewMode?: () => void;
	resetTimer?: () => void;
}

export function useSlideShortcut(
	callbacks: NavigationCallbacks,
	targetRefs: RefObject<HTMLElement | null>[],
) {
	const wheelThreshold = 40;

	const jumpToSlideModeRef = useRef(false);
	const jumpToSlideBufferRef = useRef("");

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		// jump-to-slide モード中は専用処理 (Enter / Esc / 数字 / Backspace / g)
		if (jumpToSlideModeRef.current) {
			if (event.key >= "0" && event.key <= "9") {
				event.preventDefault();
				jumpToSlideBufferRef.current += event.key;
			} else if (event.key === "Enter" || event.key === "g") {
				event.preventDefault();
				const slideNumber = Number.parseInt(jumpToSlideBufferRef.current, 10);
				if (!Number.isNaN(slideNumber) && slideNumber > 0) {
					callbacks.jumpToSlide?.(slideNumber);
				}
				exitJumpToSlideMode();
			} else if (event.key === "Escape") {
				event.preventDefault();
				exitJumpToSlideMode();
			} else if (event.key === "Backspace") {
				event.preventDefault();
				jumpToSlideBufferRef.current = jumpToSlideBufferRef.current.slice(
					0,
					-1,
				);
			}
			return;
		}

		const action = matchAction(event, "presenter");
		if (!action) return;

		switch (action) {
			case "slide.next":
				event.preventDefault();
				callbacks.moveNextSlide();
				break;
			case "slide.prev":
				event.preventDefault();
				callbacks.movePrevSlide();
				break;
			case "slide.next-10":
				event.preventDefault();
				callbacks.moveNext10Slides();
				break;
			case "slide.prev-10":
				event.preventDefault();
				callbacks.movePrev10Slides();
				break;
			case "slide.next-user":
				event.preventDefault();
				callbacks.moveNextUserSlide();
				break;
			case "slide.prev-user":
				event.preventDefault();
				callbacks.movePrevUserSlide();
				break;
			case "slide.first":
				event.preventDefault();
				callbacks.jumpToFirstSlide();
				break;
			case "slide.last":
				event.preventDefault();
				callbacks.jumpToLastSlide();
				break;
			case "slide.history-back":
				event.preventDefault();
				callbacks.goBackInHistory();
				break;
			case "slide.jump-mode":
				event.preventDefault();
				enterJumpToSlideMode();
				break;
			case "view.overview":
				event.preventDefault();
				callbacks.toggleOverviewMode?.();
				break;
			case "system.reset-timer":
				event.preventDefault();
				callbacks.resetTimer?.();
				break;
			// 他の action (tool.* / system.help / view.fullscreen) は別フックで処理
			default:
				break;
		}
	});

	const enterJumpToSlideMode = () => {
		jumpToSlideModeRef.current = true;
		jumpToSlideBufferRef.current = "";
	};

	const exitJumpToSlideMode = () => {
		jumpToSlideModeRef.current = false;
		jumpToSlideBufferRef.current = "";
	};

	const wheelAccumRef = useRef<number>(0);
	const lastWheelTimeRef = useRef<number>(0);

	const handleWheel = useEffectEvent((event: WheelEvent) => {
		if (event.ctrlKey) return;

		event.preventDefault();
		const now = performance.now();
		if (now - lastWheelTimeRef.current > 250) {
			wheelAccumRef.current = 0;
		}
		lastWheelTimeRef.current = now;

		const delta =
			Math.abs(event.deltaX) > Math.abs(event.deltaY)
				? event.deltaX
				: event.deltaY;

		wheelAccumRef.current += delta;

		if (wheelAccumRef.current >= wheelThreshold) {
			wheelAccumRef.current = 0;
			callbacks.moveNextSlide();
		} else if (wheelAccumRef.current <= -wheelThreshold) {
			wheelAccumRef.current = 0;
			callbacks.movePrevSlide();
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		window.addEventListener("keydown", handleKeyDown, {
			signal: abortController.signal,
		});
		for (const slideStageRef of targetRefs)
			if (slideStageRef.current)
				slideStageRef.current.addEventListener("wheel", handleWheel, {
					signal: abortController.signal,
					passive: false,
				});
		return () => {
			abortController.abort();
		};
	}, [targetRefs]);
}
```

- [ ] **Step 2: 既存テスト + 型チェック**

```bash
pnpm tsc -b && pnpm test && pnpm check
```

Expected: 全テスト PASS、型/lint エラーなし

- [ ] **Step 3: 手動回帰確認**

`pnpm dev` を起動して presenter 画面で以下を試す:
- `→` `←` `Space` `PageDown` `PageUp`: ページ送り
- `Shift+→`: 10 スキップ
- `↑` `↓`: ユーザースライド単位移動
- `Home` `End`: 先頭/末尾
- `Backspace`: 履歴
- `g` `1` `2` `Enter`: ページ12へ
- `Tab`: overview
- `r`: タイマーリセット

全て従来通り動くことを確認 (matchAction 経由でも挙動同じ)。

- [ ] **Step 4: コミット**

```bash
git add src/routes/-hooks/use-slide-shortcut.ts
git commit -m "refactor(slide-shortcut): matchAction 経由のディスパッチに書き換え"
```

---

## Task 4: use-tool-shortcut を matchAction 経由に書き換え

**Files:**
- Modify: `src/routes/-hooks/use-tool-shortcut.ts`

- [ ] **Step 1: switch を action ID ベースに置換**

`src/routes/-hooks/use-tool-shortcut.ts` を以下に置換:

```ts
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";
import { sendTool, type ToolSide } from "#src/broadcast";
import { matchAction } from "#src/lib/keybindings.ts";
import {
	clearPenStrokes,
	laserPosAtom,
	type ToolMode,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";

export function useToolShortcut(
	fileName: string,
	pairId: string,
	selfSide: ToolSide,
): void {
	const [toolMode, setToolMode] = useAtom(toolModeAtom);
	const doClearStrokes = useSetAtom(clearPenStrokes);
	const setLaserPos = useSetAtom(laserPosAtom);

	const changeMode = useEffectEvent((next: ToolMode) => {
		setLaserPos(null);
		setToolMode(next);
		sendTool(fileName, pairId, selfSide, { command: "tool-mode", mode: next });
	});

	const clearPen = useEffectEvent(() => {
		doClearStrokes();
		sendTool(fileName, pairId, selfSide, { command: "pen-clear" });
	});

	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		const target = event.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable)
		) {
			return;
		}

		const action = matchAction(event, selfSide);
		if (!action) return;

		switch (action) {
			case "tool.exit":
				if (toolMode !== "none") {
					event.preventDefault();
					changeMode("none");
				}
				// tool モードでない時は Esc を消費しない (overview 等が処理できるように)
				break;
			case "tool.laser":
				event.preventDefault();
				changeMode(toolMode === "laser" ? "none" : "laser");
				break;
			case "tool.pen":
				event.preventDefault();
				changeMode(toolMode === "pen" ? "none" : "pen");
				break;
			case "tool.erase":
				event.preventDefault();
				clearPen();
				break;
			default:
				break;
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		window.addEventListener("keydown", onKeyDown, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, []);
}
```

- [ ] **Step 2: 型チェック + テスト + lint**

```bash
pnpm tsc -b && pnpm test && pnpm check
```

Expected: 全 PASS

- [ ] **Step 3: 手動回帰確認**

`pnpm dev` で:
- presenter で `L` `D` `E` `Esc`: ツール切替が動く
- presentation で同様
- INPUT 要素 (Library のファイル名検索 etc) にフォーカスしている時は L/D/E が反応しない

- [ ] **Step 4: コミット**

```bash
git add src/routes/-hooks/use-tool-shortcut.ts
git commit -m "refactor(tool-shortcut): matchAction 経由のディスパッチに書き換え"
```

---

## Task 5: use-presentation-shortcut を matchAction 経由に書き換え

**Files:**
- Modify: `src/routes/presentation/-hooks/use-presentation-shortcut.ts`

- [ ] **Step 1: 書き換え**

`src/routes/presentation/-hooks/use-presentation-shortcut.ts` を以下に置換:

```ts
import { useEffect, useEffectEvent } from "react";
import { sendNavigate } from "#src/broadcast";
import { matchAction } from "#src/lib/keybindings.ts";

export function usePresentationShortcut(fileName: string, pairId: string) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		const action = matchAction(event, "presentation");
		if (!action) return;

		switch (action) {
			case "slide.next":
				event.preventDefault();
				sendNavigate(fileName, pairId, "next");
				break;
			case "slide.prev":
				event.preventDefault();
				sendNavigate(fileName, pairId, "prev");
				break;
			case "slide.first":
				event.preventDefault();
				sendNavigate(fileName, pairId, "home");
				break;
			case "slide.last":
				event.preventDefault();
				sendNavigate(fileName, pairId, "end");
				break;
			default:
				break;
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		window.addEventListener("keydown", onKeyDown, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, []);
}
```

- [ ] **Step 2: 型チェック + テスト**

```bash
pnpm tsc -b && pnpm test && pnpm check
```

Expected: 全 PASS

- [ ] **Step 3: 手動回帰**

presentation 画面にフォーカスして `→` `←` `Space` `Home` `End` で両画面同期のページ送りを確認。

- [ ] **Step 4: コミット**

```bash
git add src/routes/presentation/-hooks/use-presentation-shortcut.ts
git commit -m "refactor(presentation-shortcut): matchAction 経由のディスパッチに書き換え"
```

---

## Task 6: presentation の f/Tab/Esc ハンドリングをフックへ抽出

**Files:**
- Create: `src/routes/presentation/-hooks/use-presentation-view-shortcut.ts`
- Modify: `src/routes/presentation/index.tsx`

- [ ] **Step 1: フック作成**

`src/routes/presentation/-hooks/use-presentation-view-shortcut.ts` を作成:

```ts
import { useEffect, useEffectEvent } from "react";
import { matchAction } from "#src/lib/keybindings.ts";

interface Callbacks {
	toggleFullscreen: () => void;
	toggleOverview: () => void;
	closeOverviewIfOpen: () => boolean;
}

export function usePresentationViewShortcut(callbacks: Callbacks) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		// Esc は overview 開閉中なら閉じる (action としては tool.exit と衝突するので
		// matchAction の前に context 判定で先取りする)
		if (event.key === "Escape") {
			if (callbacks.closeOverviewIfOpen()) {
				event.preventDefault();
			}
			return;
		}

		const action = matchAction(event, "presentation");
		if (!action) return;

		switch (action) {
			case "view.fullscreen":
				event.preventDefault();
				callbacks.toggleFullscreen();
				break;
			case "view.overview":
				event.preventDefault();
				callbacks.toggleOverview();
				break;
			default:
				break;
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		window.addEventListener("keydown", onKeyDown, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, []);
}
```

- [ ] **Step 2: presentation/index.tsx を修正**

`src/routes/presentation/index.tsx` の `onKeyDown` 直書き部分 (現状 line 289-309 付近) を削除し、新フックを呼び出す。具体的には以下のブロック:

```tsx
const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
  if (e.defaultPrevented) return;
  if (e.key === "f") { ... }
  else if (e.key === "Tab") { ... }
  else if (e.key === "Escape" && isOverviewMode) { ... }
});

useEffect(() => {
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, []);
```

を以下に置換:

```tsx
import { usePresentationViewShortcut } from "./-hooks/use-presentation-view-shortcut";

// ... コンポーネント内:

usePresentationViewShortcut({
	toggleFullscreen: () => {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen();
		}
	},
	toggleOverview: () => setIsOverviewMode((prev) => !prev),
	closeOverviewIfOpen: () => {
		if (isOverviewMode) {
			setIsOverviewMode(false);
			return true;
		}
		return false;
	},
});
```

(関連する `useEffectEvent` の import が未使用になる場合は除去)

- [ ] **Step 3: 型チェック + テスト + lint**

```bash
pnpm tsc -b && pnpm test && pnpm check
```

Expected: 全 PASS

- [ ] **Step 4: 手動回帰**

presentation で:
- `f`: フルスクリーン切替
- `Tab`: overview 開閉
- overview 中の `Esc`: overview 閉じる
- ツール中の `Esc`: ツール終了 (use-tool-shortcut が処理)

- [ ] **Step 5: コミット**

```bash
git add src/routes/presentation/-hooks/use-presentation-view-shortcut.ts \
        src/routes/presentation/index.tsx
git commit -m "refactor(presentation): view ショートカットを専用フックへ抽出"
```

---

## Task 7: useKeybindingHelp フック (TDD)

**Files:**
- Create: `src/hooks/use-keybinding-help.ts`
- Test: `src/hooks/use-keybinding-help.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/hooks/use-keybinding-help.test.ts` を作成:

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useKeybindingHelp } from "./use-keybinding-help.ts";

const HELP_SEEN_KEY = "pdfpw:keybinding-help-seen";

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

	it("? キーで open し、localStorage が更新される", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
		});

		expect(result.current.isOpen).toBe(true);
		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');
	});

	it("F1 キーでも open する", () => {
		const { result } = renderHook(() => useKeybindingHelp("presentation"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});

		expect(result.current.isOpen).toBe(true);
	});

	it("? を再度押すと close する (toggle)", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
		});
		expect(result.current.isOpen).toBe(true);

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
		});
		expect(result.current.isOpen).toBe(false);
	});

	it("INPUT にフォーカスがあると ? を無視する", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		const input = document.createElement("input");
		document.body.appendChild(input);
		input.focus();

		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", bubbles: true }),
			);
		});

		expect(result.current.isOpen).toBe(false);
		document.body.removeChild(input);
	});

	it("dismissHint() で shouldShowHint が false になる", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));
		expect(result.current.shouldShowHint).toBe(true);

		act(() => {
			result.current.dismissHint();
		});

		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');
	});

	it("open() / close() メソッドで明示的に開閉できる", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			result.current.open();
		});
		expect(result.current.isOpen).toBe(true);

		act(() => {
			result.current.close();
		});
		expect(result.current.isOpen).toBe(false);
	});
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
pnpm test src/hooks/use-keybinding-help.test.ts
```

Expected: FAIL (`./use-keybinding-help.ts` が存在しない)

- [ ] **Step 3: 実装を書く**

`src/hooks/use-keybinding-help.ts` を作成:

```ts
import { useCallback, useEffect, useState } from "react";
import { matchAction } from "#src/lib/keybindings.ts";
import { useLocalStorageSync } from "./use-local-storage-sync.ts";

const HELP_SEEN_KEY = "pdfpw:keybinding-help-seen";

interface KeybindingHelp {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	shouldShowHint: boolean;
	dismissHint: () => void;
}

export function useKeybindingHelp(
	scope: "presenter" | "presentation",
): KeybindingHelp {
	const [isOpen, setIsOpen] = useState(false);
	const [helpSeen, setHelpSeen] = useLocalStorageSync<string>(
		HELP_SEEN_KEY,
		"0",
	);

	const markSeen = useCallback(() => {
		if (helpSeen !== "1") setHelpSeen("1");
	}, [helpSeen, setHelpSeen]);

	const open = useCallback(() => {
		setIsOpen(true);
		markSeen();
	}, [markSeen]);

	const close = useCallback(() => setIsOpen(false), []);

	const dismissHint = useCallback(() => {
		markSeen();
	}, [markSeen]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			const action = matchAction(event, scope);
			if (action !== "system.help") return;
			event.preventDefault();
			setIsOpen((prev) => !prev);
			markSeen();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [scope, markSeen]);

	return {
		isOpen,
		open,
		close,
		shouldShowHint: helpSeen !== "1",
		dismissHint,
	};
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
pnpm test src/hooks/use-keybinding-help.test.ts
```

Expected: 全 PASS

- [ ] **Step 5: 型チェック + lint**

```bash
pnpm tsc -b && pnpm check
```

- [ ] **Step 6: コミット**

```bash
git add src/hooks/use-keybinding-help.ts src/hooks/use-keybinding-help.test.ts
git commit -m "feat(hooks): useKeybindingHelp で ? / F1 監視と localStorage 永続化"
```

---

## Task 8: KeybindingHelpDialog コンポーネント

**Files:**
- Create: `src/components/KeybindingHelpDialog.tsx`

- [ ] **Step 1: 実装**

`src/components/KeybindingHelpDialog.tsx` を作成:

```tsx
import { Fragment, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#src/components/ui/dialog.tsx";
import { Kbd } from "#src/components/ui/kbd.tsx";
import {
	type ActionDefinition,
	type ActionId,
	type Category,
	humanizeKey,
	KEYBINDING_CATALOG,
} from "#src/lib/keybindings.ts";
import { cn } from "#src/lib/utils.ts";

const CATEGORY_LABELS: Record<Category, string> = {
	navigation: "Navigation",
	tools: "Tools",
	view: "View",
	system: "System",
};

const CATEGORY_ORDER: readonly Category[] = [
	"navigation",
	"tools",
	"view",
	"system",
];

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface ActionRow {
	id: ActionId;
	def: ActionDefinition;
}

export function KeybindingHelpDialog({ open, onOpenChange }: Props) {
	const grouped = useMemo<Record<Category, ActionRow[]>>(() => {
		const result: Record<Category, ActionRow[]> = {
			navigation: [],
			tools: [],
			view: [],
			system: [],
		};
		for (const [id, def] of Object.entries(KEYBINDING_CATALOG)) {
			result[def.category].push({ id: id as ActionId, def });
		}
		return result;
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Keyboard Shortcuts</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-5">
					{CATEGORY_ORDER.map((cat) => (
						<section key={cat} className="flex flex-col gap-2">
							<h3 className="text-[11px] font-mono uppercase tracking-wider text-muted">
								{CATEGORY_LABELS[cat]}
							</h3>
							<ul className="flex flex-col gap-1.5">
								{grouped[cat].map((row) => (
									<ShortcutRow key={row.id} def={row.def} />
								))}
							</ul>
						</section>
					))}
				</div>
				<p className="text-muted text-xs text-center pt-2 border-t border-border">
					Press <Kbd className="mx-1">?</Kbd> again or{" "}
					<Kbd className="mx-1">Esc</Kbd> to close
				</p>
			</DialogContent>
		</Dialog>
	);
}

function ShortcutRow({ def }: { def: ActionDefinition }) {
	return (
		<li className="flex items-center gap-3 text-sm">
			<div className="flex flex-wrap items-center gap-1.5 min-w-[12rem]">
				{def.bindings.map((binding, i) => (
					<Fragment key={`${binding.key}-${i}`}>
						{i > 0 && <span className="text-muted text-xs">/</span>}
						<span className="inline-flex items-center gap-1">
							{binding.shift && <Kbd>Shift</Kbd>}
							{binding.shift && <span className="text-muted text-xs">+</span>}
							{binding.ctrl && <Kbd>Ctrl</Kbd>}
							{binding.ctrl && <span className="text-muted text-xs">+</span>}
							{binding.alt && <Kbd>Alt</Kbd>}
							{binding.alt && <span className="text-muted text-xs">+</span>}
							{binding.meta && <Kbd>Meta</Kbd>}
							{binding.meta && <span className="text-muted text-xs">+</span>}
							<Kbd>{humanizeKey(binding.key)}</Kbd>
						</span>
					</Fragment>
				))}
			</div>
			<div className="flex-1 flex flex-col">
				<span className="text-fg">{def.label}</span>
				{def.hint && (
					<span className="text-muted text-xs">{def.hint}</span>
				)}
			</div>
			<ScopeBadges scope={def.scope} />
		</li>
	);
}

function ScopeBadges({ scope }: { scope: "presenter" | "presentation" | "both" }) {
	return (
		<div className="flex items-center gap-1">
			<Badge active={scope === "presenter" || scope === "both"} label="P" />
			<Badge active={scope === "presentation" || scope === "both"} label="A" />
		</div>
	);
}

function Badge({ active, label }: { active: boolean; label: string }) {
	return (
		<span
			className={cn(
				"inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold",
				active
					? "bg-accent-soft text-accent border border-accent-soft"
					: "bg-transparent text-subtle border border-border",
			)}
			aria-label={
				label === "P" ? "Presenter screen" : "Presentation (audience) screen"
			}
		>
			{label}
		</span>
	);
}
```

- [ ] **Step 2: 型チェック + lint**

```bash
pnpm tsc -b && pnpm check
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/KeybindingHelpDialog.tsx
git commit -m "feat: KeybindingHelpDialog でカタログを Radix Dialog に表示"
```

---

## Task 9: KeybindingHintToast コンポーネント

**Files:**
- Create: `src/components/KeybindingHintToast.tsx`

- [ ] **Step 1: 実装**

`src/components/KeybindingHintToast.tsx` を作成:

```tsx
import { XIcon } from "lucide-react";
import { Kbd } from "#src/components/ui/kbd.tsx";
import { Button } from "#src/components/ui/button.tsx";

interface Props {
	visible: boolean;
	onDismiss: () => void;
}

export function KeybindingHintToast({ visible, onDismiss }: Props) {
	if (!visible) return null;

	return (
		<div
			role="status"
			className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-overlay/95 backdrop-blur-md px-3 py-2 text-fg shadow-[var(--shadow-lg)]"
		>
			<span className="text-sm">
				Press <Kbd className="mx-1">?</Kbd> for keyboard shortcuts
			</span>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onDismiss}
				aria-label="Dismiss hint"
			>
				<XIcon />
			</Button>
		</div>
	);
}
```

- [ ] **Step 2: 型チェック + lint**

```bash
pnpm tsc -b && pnpm check
```

- [ ] **Step 3: コミット**

```bash
git add src/components/KeybindingHintToast.tsx
git commit -m "feat: 初回キーバインドヒントトーストを追加"
```

---

## Task 10: Header に `?` ボタン追加 (presenter ルートのみ)

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Header に onHelpClick プロップを追加**

`src/components/Header.tsx` を以下に変更:

```tsx
import { Link } from "@tanstack/react-router";
import { FileTextIcon, KeyboardIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

function GithubMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			className={className}
		>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	);
}

interface HeaderProps {
	onHelpClick?: () => void;
}

export default function Header({ onHelpClick }: HeaderProps = {}) {
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
				{onHelpClick && (
					<button
						type="button"
						onClick={onHelpClick}
						className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
						aria-label="Keyboard shortcuts"
					>
						<KeyboardIcon className="size-4" />
					</button>
				)}
				<a
					href="https://github.com/pdfpw/pdfpw.github.io"
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
					aria-label="GitHub"
				>
					<GithubMark className="size-4" />
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

- [ ] **Step 2: 型チェック + lint**

```bash
pnpm tsc -b && pnpm check
```

- [ ] **Step 3: コミット**

```bash
git add src/components/Header.tsx
git commit -m "feat(header): キーバインドヘルプボタン用の onHelpClick prop を追加"
```

---

## Task 11: presenter.tsx に Help を統合

**Files:**
- Modify: `src/routes/(main)/presenter.tsx`

- [ ] **Step 1: useKeybindingHelp と Dialog/Toast をマウント**

`src/routes/(main)/presenter.tsx` の import に追加:

```ts
import { KeybindingHelpDialog } from "#src/components/KeybindingHelpDialog";
import { KeybindingHintToast } from "#src/components/KeybindingHintToast";
import { useKeybindingHelp } from "#src/hooks/use-keybinding-help";
```

コンポーネント内 (既存のフック群の近くに) 以下を追加:

```tsx
const help = useKeybindingHelp("presenter");
```

JSX の **return 直下** (既存のレイアウト全体をラップするのではなく、ルート要素の最後の子) に以下を追加:

```tsx
<KeybindingHelpDialog open={help.isOpen} onOpenChange={(o) => (o ? help.open() : help.close())} />
{help.shouldShowHint && pdfProxy && (
	<KeybindingHintToast visible onDismiss={help.dismissHint} />
)}
```

(`pdfProxy` は既にコンポーネント内で参照可能。ヒントは PDF が読み込まれた後にのみ表示)

**重要**: presenter.tsx 自体は Header を直接マウントしないため、Header との接続は次の Step で行う。

- [ ] **Step 2: (main) レイアウトを修正**

Header は `(main)` グループ共通レイアウト (`route.tsx`) にあり、presenter.tsx の `useKeybindingHelp` 状態とは別 component tree。状態を共有するため、Header の `?` クリック時に **`window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))` を発火** することで、presenter.tsx の useKeybindingHelp が通常の `?` 押下と同じ経路で拾って toggle する。

これにより atom 化や props 伝搬を増やさずに済む。

`src/routes/(main)/route.tsx` を以下に置換:

```tsx
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import Header from "#src/components/Header.tsx";

export const Route = createFileRoute("/(main)")({
	component: RouteComponent,
});

function RouteComponent() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isPresenterRoute = pathname.startsWith("/presenter");

	return (
		<div className="grid grid-rows-[auto_1fr] h-screen">
			<Header
				onHelpClick={
					isPresenterRoute
						? () => {
								window.dispatchEvent(
									new KeyboardEvent("keydown", { key: "?" }),
								);
							}
						: undefined
				}
			/>
			<Outlet />
		</div>
	);
}
```

`onHelpClick` が `undefined` の時 Header 側は `?` ボタン非表示 (Task 10 で実装済み)。

- [ ] **Step 3: 型チェック + テスト + lint**

```bash
pnpm tsc -b && pnpm test && pnpm check
```

Expected: 全 PASS

- [ ] **Step 4: 手動確認**

`pnpm dev` で:
- ランディング画面: ヘッダーに `?` アイコンが表示**されない**
- PDF を選んで presenter 画面: ヘッダーに `?` アイコンが表示**される**
- `?` クリック: ヘルプダイアログが開く
- `?` キー押下: ヘルプダイアログが開く
- `F1` 押下: ヘルプダイアログが開く
- `Esc`: ダイアログが閉じる
- 初回: PDF 読み込み後に右下にヒントトーストが表示
- ヒント X ボタン or `?` 押下後はリロード後に再表示されない
- localStorage `pdfpw:keybinding-help-seen` クリア後、再度ヒントが表示

- [ ] **Step 5: コミット**

```bash
git add src/routes/\(main\)/presenter.tsx src/routes/\(main\)/route.tsx
git commit -m "feat(presenter): キーバインドヘルプダイアログとヒントトーストを統合"
```

---

## Task 12: presentation 画面に `?` ボタンと Help 統合

**Files:**
- Modify: `src/routes/presentation/-Menu.tsx`
- Modify: `src/routes/presentation/index.tsx`

- [ ] **Step 1: Menu に `?` ボタンを追加**

`src/routes/presentation/-Menu.tsx` の `MenuProps` に `onHelpClick` を追加し、ボタンを描画:

```tsx
import { KeyboardIcon, MaximizeIcon, MinimizeIcon } from "lucide-react";

interface MenuProps {
	pdfpcConfig: ResolvedPdfpcConfigV2;
	currentPageNumber: number;
	className?: ClassValue;
	onHelpClick?: () => void;
}

export function Menu({
	pdfpcConfig,
	currentPageNumber,
	className,
	onHelpClick,
}: MenuProps) {
	// ... 既存コードのまま ...

	return (
		<div className={...} onPointerEnter={...} onPointerLeave={...}>
			<span className="font-mono text-[11px] text-fg tabular-nums">
				{currentSlidePage} / {pdfpcConfig.pages.length}
			</span>
			{onHelpClick && (
				<Button
					variant="ghost"
					type="button"
					size="icon-sm"
					onClick={onHelpClick}
					aria-label="Keyboard shortcuts"
				>
					<KeyboardIcon />
				</Button>
			)}
			<Button
				variant="ghost"
				type="button"
				size="icon-sm"
				onClick={() => {
					if (document.fullscreenElement) document.exitFullscreen();
					else document.documentElement.requestFullscreen();
				}}
				aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
			>
				{isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
			</Button>
		</div>
	);
}
```

- [ ] **Step 2: presentation/index.tsx に Help 統合**

`src/routes/presentation/index.tsx` の import に追加:

```ts
import { KeybindingHelpDialog } from "#src/components/KeybindingHelpDialog";
import { useKeybindingHelp } from "#src/hooks/use-keybinding-help";
```

コンポーネント内に追加:

```tsx
const help = useKeybindingHelp("presentation");
```

`Menu` の使用箇所に `onHelpClick={help.open}` を追加:

```tsx
<Menu
	pdfpcConfig={pdfpcConfig}
	currentPageNumber={pageNumber}
	onHelpClick={help.open}
/>
```

JSX のルート要素の末尾に:

```tsx
<KeybindingHelpDialog
	open={help.isOpen}
	onOpenChange={(o) => (o ? help.open() : help.close())}
/>
```

(presentation 画面では HintToast は表示しない: 観客向け画面のため)

- [ ] **Step 3: 型チェック + テスト + lint**

```bash
pnpm tsc -b && pnpm test && pnpm check
```

Expected: 全 PASS

- [ ] **Step 4: 手動確認**

presentation 画面 (新しいタブを開いて proper pairing する) で:
- マウスを動かしてメニューを表示 → `?` ボタンが見える
- `?` クリック: ヘルプダイアログ表示
- `?` キー押下: 同じく表示
- `F1`: 同じ
- `Esc`: 閉じる
- ツールモード中はメニュー自動非表示なので `?` も隠れる (既存挙動)

- [ ] **Step 5: コミット**

```bash
git add src/routes/presentation/-Menu.tsx src/routes/presentation/index.tsx
git commit -m "feat(presentation): floating menu にキーバインドヘルプボタンを追加"
```

---

## Task 13: 最終検証 (全ショートカットの回帰 + ビルド)

**Files:** (検証のみ、変更なし)

- [ ] **Step 1: 全自動テスト**

```bash
pnpm tsc -b && pnpm test && pnpm check && pnpm build
```

Expected: 全 PASS、`pnpm build` で `dist/` が生成される

- [ ] **Step 2: 全ショートカットの手動回帰**

PDF を読み込んで両画面を開き、以下を **すべて** 確認:

| Key | Where | Expected |
|---|---|---|
| `→` `Space` `PageDown` | 両 | 次ページ (両画面同期) |
| `←` `PageUp` | 両 | 前ページ |
| `↑` | P | 前グループ |
| `↓` | P | 次グループ |
| `Home` `End` | 両 | 先頭/末尾 |
| `Shift+→` | P | +10 |
| `Shift+←` | P | -10 |
| `Backspace` | P | 履歴戻る |
| `g` `1` `2` `Enter` | P | ページ12へ |
| `g` `Esc` | P | ジャンプキャンセル |
| `Tab` | 両 | overview |
| overview 中 `Esc` | A | overview 閉じる |
| `r` | P | タイマーリセット |
| `f` | A | フルスクリーン |
| `L` | 両 | レーザートグル |
| `D` | 両 | ペントグル |
| `E` | 両 | 描画消去 |
| ツール中 `Esc` | 両 | ツール終了 |
| `?` | 両 | ヘルプダイアログ開閉 |
| `F1` | 両 | ヘルプダイアログ開く |
| ダイアログ中 `Esc` | 両 | ダイアログ閉じる |
| ヘッダー `?` | P | ダイアログ開く |
| Menu `?` | A | ダイアログ開く |
| マウスホイール | P | 次/前 (slide stage 上のみ) |
| INPUT フォーカス時の `L` `D` `?` 等 | 両 | 反応しない |

- [ ] **Step 3: ダーク/ライト両モード確認**

ヘッダーの sun/moon でテーマ切替し、ヘルプダイアログ・ヒントトースト・Kbd コンポーネントの表示を両モードで確認。

- [ ] **Step 4: 初回フロー確認**

```bash
# ブラウザの DevTools で:
localStorage.removeItem("pdfpw:keybinding-help-seen");
location.reload();
```

リロード後、PDF を読み込み presenter 画面に遷移すると右下にヒントトーストが表示されることを確認。`X` ボタンで dismiss し、リロードすると非表示。再度 `localStorage.removeItem(...)` で再現。

- [ ] **Step 5: 完了コミット (もしマイナー修正が必要だった場合)**

```bash
git status
# 修正があれば:
# git add ...
# git commit -m "fix(keybindings): <修正内容>"
```

---

## 自己レビューチェックリスト

実装完了前に以下を確認:

- [ ] 全ショートカットがリファクタ前と同じ動作をする (Task 13 のテーブル)
- [ ] `KEYBINDING_CATALOG` の全 19 actions がヘルプダイアログに表示される
- [ ] `?` / `F1` 両方でダイアログが開閉する
- [ ] スコープバッジ (P / A) が正しく表示される
- [ ] localStorage の `pdfpw:keybinding-help-seen` が `?` 初回押下またはトースト dismiss で `"1"` になる
- [ ] ランディング画面のヘッダーには `?` ボタンが**出ない**
- [ ] presenter ヘッダー / presentation menu の `?` ボタンクリックでヘルプ開閉
- [ ] INPUT/TEXTAREA フォーカス中は `?` `L` `D` `E` が反応しない (既存挙動)
- [ ] Biome エラーゼロ
- [ ] vitest 全 PASS
- [ ] `pnpm build` 成功
