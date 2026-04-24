# Presentation 画面操作とポインターツール Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** presentation 画面からもページ送りが可能なバックアップ操作と、両画面で双方向同期するレーザー/ペンのポインターツールを導入する。

**Architecture:** 既存の Jotai + BroadcastChannel アーキテクチャを維持。ナビゲーション解決ロジックは既存 `src/lib/navigation-utils.ts` を拡張。ポインター/ペンは両画面に SVG オーバーレイを重ね、双方向同期コマンドで state を揃える。送信側は local state を即更新しつつ broadcast する（自己エコー不要）。

**Tech Stack:** React 19, Jotai, TanStack Router, TypeScript (strict), BroadcastChannel API, vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-04-24-presentation-controls-and-pointer-tools-design.md`

---

## ファイル構造

**新規**:
- `src/lib/navigation-utils.test.ts` — vitest 初導入、既存 + 追加ヘルパーのテスト
- `src/lib/pointer-state.ts` — ツールモード/レーザー位置/ペンストロークの atom
- `src/lib/pointer-state.test.ts` — 純粋 state ロジックのテスト
- `src/components/PointerOverlay.tsx` — SVG オーバーレイ
- `src/broadcast/tools.ts` — ツール系 broadcast 型宣言 + 送信 helper
- `src/routes/-hooks/use-tool-shortcut.ts` — `L`/`D`/`E`/`Esc` 共通ショートカット
- `src/routes/presentation/-hooks/use-presentation-shortcut.ts` — presentation 側ナビゲーションショートカット

**修正**:
- `src/lib/navigation-utils.ts` — `resolveNextPage`/`resolvePrevPage`/`resolveFirstSlide`/`resolveLastSlide` を追加
- `src/broadcast/presenter.ts` — `navigate` とツール系コマンドの受信処理、ツール系の send helper
- `src/broadcast/presentation.ts` — ツール系コマンドの受信、`navigate` 送信 helper
- `src/broadcast/index.ts` — 新 hooks の re-export
- `src/routes/(main)/presenter.tsx` — ナビゲーションを helper で書き換え、overlay/ツールフック統合、ページ遷移時の pen クリア
- `src/routes/presentation/index.tsx` — `use-presentation-shortcut` / `use-tool-shortcut` / `PointerOverlay` 統合
- `src/routes/presentation/-Menu.tsx` — toolMode 中のメニュー自動表示抑制

---

## Task 1: ナビゲーションヘルパー拡張 + テスト導入

**Files:**
- Test: `src/lib/navigation-utils.test.ts` (create)
- Modify: `src/lib/navigation-utils.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/navigation-utils.test.ts` を作成:

```ts
import { describe, expect, it } from "vitest";
import type { ResolvedPdfpcConfigV2 } from "./pdfpc-config.ts";
import {
	clampPageNumber,
	getNextUserSlidePageNumber,
	getPrevUserSlidePageNumber,
	resolveFirstSlide,
	resolveLastSlide,
	resolveNextPage,
	resolvePrevPage,
} from "./navigation-utils.ts";

const makeConfig = (
	pages: number[][],
): Pick<ResolvedPdfpcConfigV2, "pages" | "totalOverlays"> => ({
	pages: pages.map((group) =>
		group.map((pageNumber) => ({
			pageNumber,
			label: String(pageNumber),
			hidden: false,
			note: "",
		})),
	) as ResolvedPdfpcConfigV2["pages"],
	totalOverlays: pages.flat().length,
});

describe("clampPageNumber", () => {
	it("最小1", () => expect(clampPageNumber(0, 10)).toBe(1));
	it("最大 max", () => expect(clampPageNumber(99, 10)).toBe(10));
	it("範囲内はそのまま", () => expect(clampPageNumber(5, 10)).toBe(5));
});

describe("resolveNextPage", () => {
	it("通常は +1", () => expect(resolveNextPage(5, 10)).toBe(6));
	it("末尾では同値", () => expect(resolveNextPage(10, 10)).toBe(10));
});

describe("resolvePrevPage", () => {
	it("通常は -1", () => expect(resolvePrevPage(5, 10)).toBe(4));
	it("先頭では 1", () => expect(resolvePrevPage(1, 10)).toBe(1));
});

describe("resolveFirstSlide / resolveLastSlide", () => {
	it("first は 1", () => expect(resolveFirstSlide()).toBe(1));
	it("last は totalOverlays", () => expect(resolveLastSlide(10)).toBe(10));
});

describe("getNextUserSlidePageNumber", () => {
	const { pages } = makeConfig([[1, 2], [3], [4, 5, 6]]);
	it("グループ内から次グループ先頭へ", () =>
		expect(getNextUserSlidePageNumber(pages, 1)).toBe(3));
	it("中央からでも次グループ先頭へ", () =>
		expect(getNextUserSlidePageNumber(pages, 2)).toBe(3));
	it("最後のグループでは null", () =>
		expect(getNextUserSlidePageNumber(pages, 5)).toBe(null));
});

describe("getPrevUserSlidePageNumber", () => {
	const { pages } = makeConfig([[1, 2], [3], [4, 5, 6]]);
	it("グループ内から前グループ先頭へ", () =>
		expect(getPrevUserSlidePageNumber(pages, 5)).toBe(3));
	it("最初のグループでは null", () =>
		expect(getPrevUserSlidePageNumber(pages, 1)).toBe(null));
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm test src/lib/navigation-utils.test.ts`
Expected: FAIL — `resolveNextPage`, `resolvePrevPage`, `resolveFirstSlide`, `resolveLastSlide` は未定義

- [ ] **Step 3: 実装を追加**

`src/lib/navigation-utils.ts` 末尾に追加:

```ts
/**
 * 次のページ番号を解決する（単純 +1、末尾クランプ）
 */
export function resolveNextPage(
	currentPageNumber: number,
	totalOverlays: number,
): number {
	return clampPageNumber(currentPageNumber + 1, totalOverlays);
}

/**
 * 前のページ番号を解決する（単純 -1、先頭クランプ）
 */
export function resolvePrevPage(
	currentPageNumber: number,
	totalOverlays: number,
): number {
	return clampPageNumber(currentPageNumber - 1, totalOverlays);
}

/**
 * 最初のページ番号
 */
export function resolveFirstSlide(): number {
	return 1;
}

/**
 * 最後のページ番号
 */
export function resolveLastSlide(totalOverlays: number): number {
	return totalOverlays;
}
```

- [ ] **Step 4: テスト成功確認**

Run: `pnpm test src/lib/navigation-utils.test.ts`
Expected: PASS (全ケース緑)

- [ ] **Step 5: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/lib/navigation-utils.ts src/lib/navigation-utils.test.ts
git commit -m "feat(navigation): resolveNext/Prev/First/Last ヘルパーとテストを追加"
```

---

## Task 2: 双方向 `navigate` コマンドの broadcast 定義

**Files:**
- Modify: `src/broadcast/presentation.ts`
- Modify: `src/broadcast/presenter.ts`

- [ ] **Step 1: presentation → presenter の `navigate` コマンドを定義**

`src/broadcast/presenter.ts` の `declare global` 内に追加:

```ts
declare global {
	interface PresentationCommandMap {
		initialize: EmptyObject;
		"get-config": EmptyObject;
		"get-pdf": EmptyObject;
		"get-blackout-state": EmptyObject;
		"get-current-page-number": EmptyObject;
		navigate: {
			direction: "next" | "prev" | "home" | "end";
		};
	}
}
```

- [ ] **Step 2: presenter 側に `navigate` 受信ハンドラを追加（まだ呼び出されない状態でよい）**

`src/broadcast/presenter.ts` の `usePresenterBroadcast` の引数に `onNavigate` を追加:

```ts
export function usePresenterBroadcast(
	fileName: string,
	pairId: string,
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pdf: File,
	isBlackout: boolean,
	pageNumber: number,
	onNavigate?: (direction: "next" | "prev" | "home" | "end") => void,
) {
```

`handleMessage` の switch 内に case 追加:

```ts
case "navigate":
	console.log("[Presenter Broadcast] Navigate:", action.direction);
	onNavigate?.(action.direction);
	break;
```

- [ ] **Step 3: presentation 側の送信 helper をファイル末尾に追加**

`src/broadcast/presentation.ts` の末尾に追加:

```ts
export function sendNavigate(
	fileName: string,
	pairId: string,
	direction: "next" | "prev" | "home" | "end",
): void {
	const channel = getBroadcastChannel(fileName, pairId);
	channel.postMessage({
		from: "presentation",
		command: "navigate",
		direction,
	} satisfies PresentationAction);
}
```

- [ ] **Step 4: index.ts に re-export**

`src/broadcast/index.ts`:

```ts
export { sendNavigate, usePresentationBroadcast } from "./presentation";
```

- [ ] **Step 5: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし（`presenter.tsx` で新しい optional パラメータを使っていないが optional なので OK）

- [ ] **Step 6: コミット**

```bash
git add src/broadcast/
git commit -m "feat(broadcast): navigate コマンドを追加"
```

---

## Task 3: presenter に `navigate` 受信時のロジックを接続

**Files:**
- Modify: `src/routes/(main)/presenter.tsx`

- [ ] **Step 1: `onNavigate` ハンドラを作る**

`src/routes/(main)/presenter.tsx` の `PresenterContent` 関数内、`usePresenterBroadcast` 呼び出しの直前に追加:

```ts
const handleNavigate = useCallback(
	(direction: "next" | "prev" | "home" | "end") => {
		switch (direction) {
			case "next":
				nextSlide();
				break;
			case "prev":
				prevSlide();
				break;
			case "home":
				jumpToFirstSlide();
				break;
			case "end":
				jumpToLastSlide();
				break;
		}
	},
	// biome-ignore lint/correctness/useExhaustiveDependencies: nextSlide 等は毎レンダーで作り直される
	[pageNumber, pdfpcConfig.totalOverlays],
);
```

- [ ] **Step 2: `usePresenterBroadcast` に渡す**

```ts
usePresenterBroadcast(
	fileName,
	pairId,
	pdfpcConfig,
	pdf,
	isBlackout,
	pageNumber,
	handleNavigate,
);
```

- [ ] **Step 3: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/routes/\(main\)/presenter.tsx
git commit -m "feat(presenter): navigate コマンドを受信してページ送りに接続"
```

---

## Task 4: presentation 側ナビゲーションショートカットフック

**Files:**
- Create: `src/routes/presentation/-hooks/use-presentation-shortcut.ts`

- [ ] **Step 1: フックを作成**

```ts
import { useEffect, useEffectEvent } from "react";
import { sendNavigate } from "#src/broadcast";

export function usePresentationShortcut(fileName: string, pairId: string) {
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		switch (event.key) {
			case " ":
			case "ArrowRight":
			case "PageDown":
				event.preventDefault();
				sendNavigate(fileName, pairId, "next");
				break;
			case "ArrowLeft":
			case "PageUp":
				event.preventDefault();
				sendNavigate(fileName, pairId, "prev");
				break;
			case "Home":
				event.preventDefault();
				sendNavigate(fileName, pairId, "home");
				break;
			case "End":
				event.preventDefault();
				sendNavigate(fileName, pairId, "end");
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

- [ ] **Step 2: presentation に組み込む**

`src/routes/presentation/index.tsx` の `PresentationView` コンポーネント（既存の `onKeyDown` 定義の近く）に:

```ts
import { usePresentationShortcut } from "./-hooks/use-presentation-shortcut";

// PresentationView 内に fileName と pairId が必要。PresentationBroadcastData から渡す
```

**props に `fileName` と `pairId` を追加する**:

`PresentationBroadcastData` の return:

```ts
return <PresentationView {...initData} localPdf={pdf} fileName={fileName} pairId={pairId} />;
```

`PresentationView` のシグネチャ修正:

```ts
function PresentationView({
	pdfpcConfig,
	pdfData,
	pageNumber,
	isBlackout,
	localPdf,
	fileName,
	pairId,
}: {
	pdfpcConfig: ResolvedPdfpcConfigV2;
	pdfData: ArrayBuffer;
	pageNumber: number;
	isBlackout: boolean;
	localPdf?: File | FileSystemFileHandle;
	fileName: string;
	pairId: string;
}) {
```

body 内（`useEffect` でキーバインドを付けている既存箇所のすぐ上）に:

```ts
usePresentationShortcut(fileName, pairId);
```

- [ ] **Step 3: 動作確認（手動）**

Run: `pnpm dev`
手順:
1. ブラウザで `http://localhost:6123` を開く
2. PDF をロードしてプレゼンターを開く
3. presentation 画面を別タブで開く
4. presentation 画面にフォーカスして `Space` / `→` / `←` / `Home` / `End` を押すとページが進む/戻る/先頭/末尾へ飛ぶことを確認

Expected: presenter と presentation の両画面でページ同期

- [ ] **Step 4: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/routes/presentation/
git commit -m "feat(presentation): バックアップ用ページ送りショートカットを追加"
```

---

## Task 5: pointer-state atoms とテスト

**Files:**
- Create: `src/lib/pointer-state.ts`
- Create: `src/lib/pointer-state.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/pointer-state.test.ts`:

```ts
import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
	addPenPoint,
	addPenStroke,
	clearPenStrokes,
	endPenStroke,
	laserPosAtom,
	penStrokesAtom,
	toolModeAtom,
} from "./pointer-state.ts";

describe("toolModeAtom", () => {
	it("初期値は none", () => {
		const store = createStore();
		expect(store.get(toolModeAtom)).toBe("none");
	});
	it("laser/pen/none に切り替えできる", () => {
		const store = createStore();
		store.set(toolModeAtom, "laser");
		expect(store.get(toolModeAtom)).toBe("laser");
		store.set(toolModeAtom, "pen");
		expect(store.get(toolModeAtom)).toBe("pen");
		store.set(toolModeAtom, "none");
		expect(store.get(toolModeAtom)).toBe("none");
	});
});

describe("laserPosAtom", () => {
	it("初期値は null", () => {
		const store = createStore();
		expect(store.get(laserPosAtom)).toBe(null);
	});
});

describe("penStrokes 操作", () => {
	it("addPenStroke で新規ストローク追加", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0.1, y: 0.2 });
		expect(store.get(penStrokesAtom)).toEqual([
			{ id: "s1", points: [{ x: 0.1, y: 0.2 }], ended: false },
		]);
	});

	it("addPenPoint で既存ストロークに点追加", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0.1, y: 0.2 });
		store.set(addPenPoint, { strokeId: "s1", x: 0.3, y: 0.4 });
		expect(store.get(penStrokesAtom)[0].points).toEqual([
			{ x: 0.1, y: 0.2 },
			{ x: 0.3, y: 0.4 },
		]);
	});

	it("addPenPoint で未知の strokeId ならストロークを自動作成", () => {
		const store = createStore();
		store.set(addPenPoint, { strokeId: "s_new", x: 0.5, y: 0.5 });
		expect(store.get(penStrokesAtom)).toEqual([
			{ id: "s_new", points: [{ x: 0.5, y: 0.5 }], ended: false },
		]);
	});

	it("endPenStroke で ended=true", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0, y: 0 });
		store.set(endPenStroke, { strokeId: "s1" });
		expect(store.get(penStrokesAtom)[0].ended).toBe(true);
	});

	it("clearPenStrokes で空", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0, y: 0 });
		store.set(clearPenStrokes);
		expect(store.get(penStrokesAtom)).toEqual([]);
	});
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `pnpm test src/lib/pointer-state.test.ts`
Expected: FAIL — モジュール未定義

- [ ] **Step 3: 実装を追加**

`src/lib/pointer-state.ts`:

```ts
import { atom } from "jotai";

export type ToolMode = "none" | "laser" | "pen";

export interface NormalizedPoint {
	x: number;
	y: number;
}

export interface PenStroke {
	id: string;
	points: NormalizedPoint[];
	ended: boolean;
}

export const toolModeAtom = atom<ToolMode>("none");
export const laserPosAtom = atom<NormalizedPoint | null>(null);
export const penStrokesAtom = atom<PenStroke[]>([]);

export const addPenStroke = atom(
	null,
	(get, set, payload: { strokeId: string; x: number; y: number }) => {
		const strokes = get(penStrokesAtom);
		if (strokes.some((s) => s.id === payload.strokeId)) return;
		set(penStrokesAtom, [
			...strokes,
			{
				id: payload.strokeId,
				points: [{ x: payload.x, y: payload.y }],
				ended: false,
			},
		]);
	},
);

export const addPenPoint = atom(
	null,
	(get, set, payload: { strokeId: string; x: number; y: number }) => {
		const strokes = get(penStrokesAtom);
		const existing = strokes.find((s) => s.id === payload.strokeId);
		if (!existing) {
			set(penStrokesAtom, [
				...strokes,
				{
					id: payload.strokeId,
					points: [{ x: payload.x, y: payload.y }],
					ended: false,
				},
			]);
			return;
		}
		set(
			penStrokesAtom,
			strokes.map((s) =>
				s.id === payload.strokeId
					? { ...s, points: [...s.points, { x: payload.x, y: payload.y }] }
					: s,
			),
		);
	},
);

export const endPenStroke = atom(
	null,
	(get, set, payload: { strokeId: string }) => {
		const strokes = get(penStrokesAtom);
		set(
			penStrokesAtom,
			strokes.map((s) =>
				s.id === payload.strokeId ? { ...s, ended: true } : s,
			),
		);
	},
);

export const clearPenStrokes = atom(null, (_get, set) => {
	set(penStrokesAtom, []);
});
```

- [ ] **Step 4: テスト成功確認**

Run: `pnpm test src/lib/pointer-state.test.ts`
Expected: PASS

- [ ] **Step 5: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`

- [ ] **Step 6: コミット**

```bash
git add src/lib/pointer-state.ts src/lib/pointer-state.test.ts
git commit -m "feat(pointer): ツールモード/レーザー/ペンストローク atom を追加"
```

---

## Task 6: PointerOverlay コンポーネント

**Files:**
- Create: `src/components/PointerOverlay.tsx`

- [ ] **Step 1: オーバーレイを作る**

```tsx
import { useAtomValue } from "jotai";
import {
	laserPosAtom,
	penStrokesAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";
import { cn } from "#src/lib/utils.ts";

interface PointerOverlayProps {
	className?: string;
}

const PEN_COLOR = "#ef4444";
const PEN_WIDTH = 0.004; // 正規化座標系でのおおよその太さ (viewBox=1 基準)

export function PointerOverlay({ className }: PointerOverlayProps) {
	const toolMode = useAtomValue(toolModeAtom);
	const laserPos = useAtomValue(laserPosAtom);
	const strokes = useAtomValue(penStrokesAtom);

	if (toolMode === "none" && strokes.length === 0) return null;

	return (
		<svg
			className={cn("absolute inset-0 pointer-events-none", className)}
			viewBox="0 0 1 1"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{strokes.map((stroke) =>
				stroke.points.length === 0 ? null : (
					<polyline
						key={stroke.id}
						points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
						fill="none"
						stroke={PEN_COLOR}
						strokeWidth={PEN_WIDTH}
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				),
			)}
			{toolMode === "laser" && laserPos !== null ? (
				<circle
					cx={laserPos.x}
					cy={laserPos.y}
					r={0.008}
					fill={PEN_COLOR}
					opacity={0.8}
					style={{ mixBlendMode: "multiply" }}
				/>
			) : null}
		</svg>
	);
}
```

メモ: `vectorEffect="non-scaling-stroke"` でアスペクト比に関わらず線幅をピクセル相当に保つ。ただしこの SVG は viewBox 1x1 なので stroke-width は px 換算になる（CSS pixel units）。実サイズは `preserveAspectRatio="none"` でコンテナに合わせて引き伸ばされる。

- [ ] **Step 2: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/PointerOverlay.tsx
git commit -m "feat(components): PointerOverlay を追加"
```

---

## Task 7: ツール系 broadcast 型と送信 helper

**Files:**
- Create: `src/broadcast/tools.ts`
- Modify: `src/broadcast/index.ts`

- [ ] **Step 1: tools.ts を作成**

```ts
import { getBroadcastChannel } from "./channel";
import type {
	BroadcastAction,
	PresentationAction,
	PresenterAction,
} from "./types";

// 双方向コマンド: 両方のマップに宣言することで from 問わず送信可能に
declare global {
	interface PresenterCommandMap {
		"tool-mode": { mode: "none" | "laser" | "pen" };
		"pointer-move": { x: number; y: number };
		"pointer-leave": Record<string, never>;
		"pen-stroke-start": { strokeId: string; x: number; y: number };
		"pen-stroke-point": { strokeId: string; x: number; y: number };
		"pen-stroke-end": { strokeId: string };
		"pen-clear": Record<string, never>;
	}
	interface PresentationCommandMap {
		"tool-mode": { mode: "none" | "laser" | "pen" };
		"pointer-move": { x: number; y: number };
		"pointer-leave": Record<string, never>;
		"pen-stroke-start": { strokeId: string; x: number; y: number };
		"pen-stroke-point": { strokeId: string; x: number; y: number };
		"pen-stroke-end": { strokeId: string };
		"pen-clear": Record<string, never>;
	}
}

import type { ToolMode } from "#src/lib/pointer-state.ts";

export type ToolSide = "presenter" | "presentation";

type ToolCommand =
	| { command: "tool-mode"; mode: ToolMode }
	| { command: "pointer-move"; x: number; y: number }
	| { command: "pointer-leave" }
	| { command: "pen-stroke-start"; strokeId: string; x: number; y: number }
	| { command: "pen-stroke-point"; strokeId: string; x: number; y: number }
	| { command: "pen-stroke-end"; strokeId: string }
	| { command: "pen-clear" };

export function sendTool(
	fileName: string,
	pairId: string,
	from: ToolSide,
	cmd: ToolCommand,
): void {
	const channel = getBroadcastChannel(fileName, pairId);
	// postMessage は any を受け付けるため厳密な satisfies は不要。
	// 型安全性は呼び出し側の引数型 (ToolCommand, ToolSide) で担保される
	channel.postMessage({ from, ...cmd });
}

export type ToolAction = Extract<
	PresenterAction | PresentationAction,
	{
		command:
			| "tool-mode"
			| "pointer-move"
			| "pointer-leave"
			| "pen-stroke-start"
			| "pen-stroke-point"
			| "pen-stroke-end"
			| "pen-clear";
	}
>;
```

- [ ] **Step 2: index.ts に export**

`src/broadcast/index.ts`:

```ts
export { sendTool, type ToolAction, type ToolSide } from "./tools";
```

**注意**: `ToolMode` は `#src/lib/pointer-state.ts` から export されているため broadcast からは再 export しない。また `tools.ts` の `declare global` を有効化するために、どこからか import される必要がある。`index.ts` で re-export していれば OK。

- [ ] **Step 3: 型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/broadcast/
git commit -m "feat(broadcast): ツール系双方向コマンド (pointer/pen/tool-mode) を定義"
```

---

## Task 8: useToolBroadcast フック（両側共通の受信処理）

**Files:**
- Modify: `src/broadcast/tools.ts`

- [ ] **Step 1: 受信フックを追加**

`src/broadcast/tools.ts` の末尾に追加:

```ts
import { useEffect, useEffectEvent } from "react";
import { useSetAtom } from "jotai";
import {
	addPenPoint,
	addPenStroke,
	clearPenStrokes,
	endPenStroke,
	laserPosAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";

/**
 * ツール系コマンドを受信して pointer-state atoms を更新する。
 * 自身が送信したメッセージは BroadcastChannel の仕様により受信されないため、
 * 送信側は別途 local atom を更新すること。
 */
export function useToolBroadcast(
	fileName: string,
	pairId: string,
	selfSide: ToolSide,
): void {
	const setToolMode = useSetAtom(toolModeAtom);
	const setLaserPos = useSetAtom(laserPosAtom);
	const doAddPenStroke = useSetAtom(addPenStroke);
	const doAddPenPoint = useSetAtom(addPenPoint);
	const doEndPenStroke = useSetAtom(endPenStroke);
	const doClearStrokes = useSetAtom(clearPenStrokes);

	const onAction = useEffectEvent((action: ToolAction) => {
		switch (action.command) {
			case "tool-mode":
				setToolMode(action.mode);
				break;
			case "pointer-move":
				setLaserPos({ x: action.x, y: action.y });
				break;
			case "pointer-leave":
				setLaserPos(null);
				break;
			case "pen-stroke-start":
				doAddPenStroke({
					strokeId: action.strokeId,
					x: action.x,
					y: action.y,
				});
				break;
			case "pen-stroke-point":
				doAddPenPoint({
					strokeId: action.strokeId,
					x: action.x,
					y: action.y,
				});
				break;
			case "pen-stroke-end":
				doEndPenStroke({ strokeId: action.strokeId });
				break;
			case "pen-clear":
				doClearStrokes();
				break;
		}
	});

	useEffect(() => {
		const channel = getBroadcastChannel(fileName, pairId);
		const abortController = new AbortController();
		const listener = (event: MessageEvent) => {
			const action = event.data as BroadcastAction;
			if (action.from === selfSide) return;
			if (
				action.command === "tool-mode" ||
				action.command === "pointer-move" ||
				action.command === "pointer-leave" ||
				action.command === "pen-stroke-start" ||
				action.command === "pen-stroke-point" ||
				action.command === "pen-stroke-end" ||
				action.command === "pen-clear"
			) {
				onAction(action as ToolAction);
			}
		};
		channel.addEventListener("message", listener, {
			signal: abortController.signal,
		});
		return () => abortController.abort();
	}, [fileName, pairId, selfSide]);
}
```

- [ ] **Step 2: index.ts に export**

```ts
export { sendTool, useToolBroadcast, type ToolAction, type ToolSide } from "./tools";
```

- [ ] **Step 3: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/broadcast/
git commit -m "feat(broadcast): useToolBroadcast で双方向ツールコマンド受信"
```

---

## Task 9: ツールショートカットフック（L/D/E/Esc）

**Files:**
- Create: `src/routes/-hooks/use-tool-shortcut.ts`

- [ ] **Step 1: フック作成**

```ts
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";
import { sendTool, type ToolSide } from "#src/broadcast";
import {
	clearPenStrokes,
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

	const changeMode = useEffectEvent((next: ToolMode) => {
		setToolMode(next);
		sendTool(fileName, pairId, selfSide, { command: "tool-mode", mode: next });
	});

	const clearPen = useEffectEvent(() => {
		doClearStrokes();
		sendTool(fileName, pairId, selfSide, { command: "pen-clear" });
	});

	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		// IME やテキスト入力中は無視
		const target = event.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable)
		) {
			return;
		}

		switch (event.key) {
			case "l":
			case "L":
				event.preventDefault();
				changeMode(toolMode === "laser" ? "none" : "laser");
				break;
			case "d":
			case "D":
				event.preventDefault();
				changeMode(toolMode === "pen" ? "none" : "pen");
				break;
			case "e":
			case "E":
				event.preventDefault();
				clearPen();
				break;
			case "Escape":
				if (toolMode !== "none") {
					event.preventDefault();
					changeMode("none");
				}
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

- [ ] **Step 2: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/routes/-hooks/use-tool-shortcut.ts
git commit -m "feat(hooks): useToolShortcut (L/D/E/Esc) を追加"
```

---

## Task 10: pointer イベント発火 hook（両画面共通）

**Files:**
- Create: `src/routes/-hooks/use-pointer-emitter.ts`

- [ ] **Step 1: フック作成**

```ts
import { useAtomValue, useSetAtom } from "jotai";
import {
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
} from "react";
import { sendTool, type ToolSide } from "#src/broadcast";
import {
	addPenPoint,
	addPenStroke,
	endPenStroke,
	laserPosAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";

/**
 * 指定要素内でのマウス移動/クリックを観察し、tool-mode に応じて
 * ローカルの pointer-state を更新 + broadcast する。
 * - laser: pointermove で座標を更新/送信
 * - pen: pointerdown で新規ストローク、drag 中 pointermove で点追加、pointerup で終了
 */
export function usePointerEmitter(
	containerRef: RefObject<HTMLElement | null>,
	fileName: string,
	pairId: string,
	selfSide: ToolSide,
): void {
	const toolMode = useAtomValue(toolModeAtom);
	const setLaserPos = useSetAtom(laserPosAtom);
	const doAddPenStroke = useSetAtom(addPenStroke);
	const doAddPenPoint = useSetAtom(addPenPoint);
	const doEndPenStroke = useSetAtom(endPenStroke);

	const strokeIdRef = useRef<string | null>(null);
	const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
	const rafHandleRef = useRef<number | null>(null);

	const flushPendingPoint = useEffectEvent(() => {
		rafHandleRef.current = null;
		const p = pendingPointRef.current;
		if (!p) return;
		pendingPointRef.current = null;

		if (toolMode === "laser") {
			setLaserPos(p);
			sendTool(fileName, pairId, selfSide, {
				command: "pointer-move",
				x: p.x,
				y: p.y,
			});
		} else if (toolMode === "pen" && strokeIdRef.current) {
			doAddPenPoint({ strokeId: strokeIdRef.current, x: p.x, y: p.y });
			sendTool(fileName, pairId, selfSide, {
				command: "pen-stroke-point",
				strokeId: strokeIdRef.current,
				x: p.x,
				y: p.y,
			});
		}
	});

	const schedule = useCallback(
		(p: { x: number; y: number }) => {
			pendingPointRef.current = p;
			if (rafHandleRef.current !== null) return;
			rafHandleRef.current = requestAnimationFrame(flushPendingPoint);
		},
		[flushPendingPoint],
	);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		if (toolMode === "none") return;

		const abortController = new AbortController();

		const toNormalized = (event: PointerEvent): { x: number; y: number } => {
			const rect = el.getBoundingClientRect();
			const x = (event.clientX - rect.left) / rect.width;
			const y = (event.clientY - rect.top) / rect.height;
			return {
				x: Math.max(0, Math.min(1, x)),
				y: Math.max(0, Math.min(1, y)),
			};
		};

		const onMove = (event: PointerEvent) => {
			schedule(toNormalized(event));
		};

		const onLeave = () => {
			pendingPointRef.current = null;
			if (toolMode === "laser") {
				setLaserPos(null);
				sendTool(fileName, pairId, selfSide, { command: "pointer-leave" });
			}
		};

		const onDown = (event: PointerEvent) => {
			if (toolMode !== "pen") return;
			if (event.button !== 0) return;
			event.preventDefault();
			const p = toNormalized(event);
			const strokeId =
				typeof crypto.randomUUID === "function"
					? crypto.randomUUID()
					: `stroke-${Date.now()}-${Math.random()}`;
			strokeIdRef.current = strokeId;
			doAddPenStroke({ strokeId, x: p.x, y: p.y });
			sendTool(fileName, pairId, selfSide, {
				command: "pen-stroke-start",
				strokeId,
				x: p.x,
				y: p.y,
			});
			(event.target as Element).setPointerCapture?.(event.pointerId);
		};

		const onUp = (event: PointerEvent) => {
			if (!strokeIdRef.current) return;
			const strokeId = strokeIdRef.current;
			strokeIdRef.current = null;
			doEndPenStroke({ strokeId });
			sendTool(fileName, pairId, selfSide, {
				command: "pen-stroke-end",
				strokeId,
			});
			(event.target as Element).releasePointerCapture?.(event.pointerId);
		};

		el.addEventListener("pointermove", onMove, { signal: abortController.signal });
		el.addEventListener("pointerleave", onLeave, { signal: abortController.signal });
		el.addEventListener("pointerdown", onDown, { signal: abortController.signal });
		el.addEventListener("pointerup", onUp, { signal: abortController.signal });
		el.addEventListener("pointercancel", onUp, { signal: abortController.signal });

		return () => {
			abortController.abort();
			if (rafHandleRef.current !== null) {
				cancelAnimationFrame(rafHandleRef.current);
				rafHandleRef.current = null;
			}
		};
	}, [containerRef, toolMode, fileName, pairId, selfSide, schedule]);
}
```

- [ ] **Step 2: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/routes/-hooks/use-pointer-emitter.ts
git commit -m "feat(hooks): usePointerEmitter でポインタ/ペンをブロードキャスト"
```

---

## Task 11: presenter 側統合（overlay + tool + pointer + ページ遷移クリア）

**Files:**
- Modify: `src/routes/(main)/presenter.tsx`
- Modify: `src/routes/(main)/-presenter/SlideStage.tsx`

- [ ] **Step 1: SlideStage で overlay を子として受け取れるようにする**

`src/routes/(main)/-presenter/SlideStage.tsx`:

```tsx
import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ReactNode, RefObject } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import { cn } from "#src/lib/utils.ts";

export const SlideStage = function SlideStage({
	pdfProxy,
	pageNumber,
	className,
	ref,
	children,
}: {
	pdfProxy: PDFDocumentProxy;
	pageNumber: number;
	className?: ClassValue;
	ref?: RefObject<HTMLElement | null>;
	children?: ReactNode;
}) {
	return (
		<section className={cn("relative", className)} ref={ref}>
			<PdfPage
				pdfProxy={pdfProxy}
				pageNumber={pageNumber}
				className="absolute inset-0"
			/>
			{children}
		</section>
	);
};
```

- [ ] **Step 2: presenter.tsx に統合**

`src/routes/(main)/presenter.tsx` の `PresenterContent` 内:

先頭の import 追加:

```ts
import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { sendTool, useToolBroadcast } from "#src/broadcast";
import { PointerOverlay } from "#src/components/PointerOverlay.tsx";
import { clearPenStrokes } from "#src/lib/pointer-state.ts";
import { useToolShortcut } from "../-hooks/use-tool-shortcut";
import { usePointerEmitter } from "../-hooks/use-pointer-emitter";
```

`PresenterContent` 内、既存の `usePresenterBroadcast` の下辺りに追加:

```ts
useToolBroadcast(fileName, pairId, "presenter");
useToolShortcut(fileName, pairId, "presenter");
usePointerEmitter(slideStageRef, fileName, pairId, "presenter");

// ページ遷移時にペンストロークを自動クリア
const doClearStrokes = useSetAtom(clearPenStrokes);
useEffect(() => {
	doClearStrokes();
	sendTool(fileName, pairId, "presenter", { command: "pen-clear" });
}, [pageNumber, fileName, pairId, doClearStrokes]);
```

`SlideStage` の children として `PointerOverlay` を追加:

```tsx
<SlideStage
	pdfProxy={pdfProxy}
	pageNumber={pageNumber}
	className="aspect-video h-full max-w-full place-self-center"
	ref={slideStageRef}
>
	<PointerOverlay />
</SlideStage>
```

- [ ] **Step 3: 手動動作確認**

Run: `pnpm dev`
1. ブラウザで PDF を開いてプレゼンターを開く
2. `L` を押す → 自画面でカーソルに赤ドットが追従
3. もう一度 `L` で消える
4. `D` を押してスライド上でドラッグ → 赤い線が描かれる
5. 次のページへ進む → 線が消える
6. `D` でペンに戻り、何本か描いてから `E` → 消える
7. `Esc` → ツールモード none

- [ ] **Step 4: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/routes/\(main\)/
git commit -m "feat(presenter): PointerOverlay とツール操作を統合"
```

---

## Task 12: presentation 側統合（overlay + tool + pointer）

**Files:**
- Modify: `src/routes/presentation/index.tsx`
- Modify: `src/routes/presentation/-SlideStage.tsx`

- [ ] **Step 1: SlideStage で overlay を子として受け取る**

`src/routes/presentation/-SlideStage.tsx`:

```tsx
import type { ClassValue } from "clsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ReactNode, RefObject } from "react";
import { PdfPage } from "#src/components/PdfPage.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { cn } from "#src/lib/utils.ts";

interface SlideStageProps {
	pdfProxy: PDFDocumentProxy;
	pdfpcConfig: ResolvedPdfpcConfigV2;
	currentPageNumber: number;
	isBlackout: boolean;
	className?: ClassValue;
	stageRef?: RefObject<HTMLDivElement | null>;
	children?: ReactNode;
}

function preloadSlide(
	pdfpcConfig: ResolvedPdfpcConfigV2,
	pageNumber: number,
): number[] {
	const pages = pdfpcConfig.pages.flat();
	const currentIndex = pages.findIndex((p) => p.pageNumber === pageNumber);
	if (currentIndex === -1) return [pageNumber];
	const start = Math.max(0, currentIndex - 10);
	const end = currentIndex + 10;
	return pages.slice(start, end + 1).map((p) => p.pageNumber);
}

export function SlideStage({
	pdfProxy,
	pdfpcConfig,
	currentPageNumber,
	isBlackout,
	className,
	stageRef,
	children,
}: SlideStageProps) {
	const preloadPages = preloadSlide(pdfpcConfig, currentPageNumber);
	return (
		<div className={cn("relative", className)} ref={stageRef}>
			{preloadPages.map((pageNumber) => (
				<PdfPage
					key={pageNumber}
					pdfProxy={pdfProxy}
					pageNumber={pageNumber}
					className={[
						"absolute inset-0",
						{
							"opacity-0 pointer-events-none":
								pageNumber !== currentPageNumber || isBlackout,
						},
					]}
				/>
			))}
			{children}
		</div>
	);
}
```

- [ ] **Step 2: PresentationView に統合**

`src/routes/presentation/index.tsx` の import 追加:

```ts
import { useRef } from "react";
import { useToolBroadcast } from "#src/broadcast";
import { PointerOverlay } from "#src/components/PointerOverlay.tsx";
import { useToolShortcut } from "#src/routes/-hooks/use-tool-shortcut";
import { usePointerEmitter } from "#src/routes/-hooks/use-pointer-emitter";
```

`PresentationView` 内（既存の `onKeyDown` 定義より上に）:

```ts
const stageRef = useRef<HTMLDivElement | null>(null);

useToolBroadcast(fileName, pairId, "presentation");
useToolShortcut(fileName, pairId, "presentation");
usePointerEmitter(stageRef, fileName, pairId, "presentation");
```

JSX 修正:

```tsx
<SlideStage
	pdfProxy={pdfProxy}
	pdfpcConfig={pdfpcConfig}
	currentPageNumber={currentPageNumber}
	isBlackout={currentIsBlackout}
	stageRef={stageRef}
>
	<PointerOverlay />
</SlideStage>
```

- [ ] **Step 3: 手動動作確認**

Run: `pnpm dev`
1. presenter と presentation を両方開く
2. presenter 側で `L` → 両画面でレーザーが同期
3. presentation 側で `L` → 両画面でレーザーが同期（双方向）
4. どちら側で `D` にしてドラッグしても両画面に描画が出る
5. ページ遷移すると両画面で線が消える
6. `E` で消える

- [ ] **Step 4: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/routes/presentation/
git commit -m "feat(presentation): PointerOverlay とツール操作を統合"
```

---

## Task 13: presentation メニューのツール中抑制

**Files:**
- Modify: `src/routes/presentation/-Menu.tsx`

- [ ] **Step 1: toolMode を購読し、pointer リスナーを条件付きに**

`src/routes/presentation/-Menu.tsx` の import に追加:

```ts
import { useAtomValue } from "jotai";
import { toolModeAtom } from "#src/lib/pointer-state.ts";
```

コンポーネント内（既存の useEffect より上）:

```ts
const toolMode = useAtomValue(toolModeAtom);
```

既存の `useEffect(() => { scheduleHide(); ... })` を修正し、toolMode を依存に、かつ ON 時はリスナーを張らず visible を false に固定:

```ts
useEffect(() => {
	if (toolMode !== "none") {
		// ツール使用中はメニューを出さない
		if (hideTimerRef.current) {
			window.clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
		setVisible(false);
		return;
	}

	scheduleHide();

	const onPointerMove = (): void => {
		showAndResetTimer();
	};
	const onPointerDown = (): void => {
		showAndResetTimer();
	};

	window.addEventListener("pointermove", onPointerMove, { passive: true });
	window.addEventListener("pointerdown", onPointerDown, { passive: true });

	return () => {
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerdown", onPointerDown);
		if (hideTimerRef.current) {
			window.clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
	};
}, [toolMode]);
```

- [ ] **Step 2: 手動動作確認**

Run: `pnpm dev`
1. presentation 画面でマウスを動かす → メニューが出る
2. `L` を押す → メニューが即座に消え、以降カーソル移動でも出ない
3. `Esc` → 通常挙動に戻る

- [ ] **Step 3: 型チェックと lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/routes/presentation/-Menu.tsx
git commit -m "feat(presentation): ツールモード中はメニュー自動表示を抑制"
```

---

## Task 14: 最終検証

**Files:** なし（確認のみ）

- [ ] **Step 1: 全体型チェック**

Run: `pnpm tsc -b`
Expected: エラーなし

- [ ] **Step 2: lint と format チェック**

Run: `pnpm check`
Expected: エラー/警告なし。もし format のみ差分があれば `pnpm format` を実行してコミット

- [ ] **Step 3: 全テスト実行**

Run: `pnpm test`
Expected: `navigation-utils.test.ts`, `pointer-state.test.ts` が全て PASS

- [ ] **Step 4: 本番ビルド**

Run: `pnpm build`
Expected: 成功

- [ ] **Step 5: 統合手動テスト**

Run: `pnpm dev`
以下のシナリオを順に確認:

**A. presentation からのページ送り**
- presentation にフォーカス → `Space`/`→`/`PageDown` で次、`←`/`PageUp` で前、`Home`/`End` で先頭/末尾。presenter 画面と同期

**B. レーザー双方向**
- presenter で `L` → 両画面でレーザー表示
- マウスを動かすと両画面で追従
- presenter で `L` で OFF → 両画面消える
- presentation で `L` → 両画面 ON、presentation のマウス移動が両画面に反映

**C. ペン双方向**
- presenter で `D` → ドラッグで両画面に赤線
- presentation で `D` に切り替え → presentation 側でドラッグしても両画面に描画
- 次ページに進む → 両画面で線が消える
- 再度描いて `E` → 両画面で消える

**D. メニュー抑制**
- presentation 画面でマウス動かすとメニュー表示
- `L` または `D` に入るとメニュー消えて以降出ない
- `Esc` で元に戻る

**E. エッジケース**
- スライド領域外にカーソルを出す → レーザー消える
- ペン描画中に領域外へドラッグ → ストロークは setPointerCapture で継続

- [ ] **Step 6: 最終コミット（必要なら format 差分など）**

```bash
git status
# 差分があれば
git add -A
git commit -m "chore: lint/format fixes"
```

---

## 完了条件チェックリスト

スペック `docs/superpowers/specs/2026-04-24-presentation-controls-and-pointer-tools-design.md` の完了条件に対応:

- [x] presentation 画面で Space/矢印/PageUp/Down/Home/End でページが進む → Task 4
- [x] `L` でレーザーが両画面に出る → Task 9, 11, 12
- [x] `D` でペン、ページ遷移で自動クリア、`E` で手動クリア → Task 9, 10, 11
- [x] ツール中は presentation メニュー自動表示を抑制 → Task 13
- [x] `navigation-utils.ts` 新規ヘルパーの単体テストが通る → Task 1
- [x] `pnpm tsc -b` / `pnpm lint` / `pnpm test` が通る → Task 14

## スコープ外（将来タスク）

- presentation 側からのブラックアウト/フリーズ操作
- タッチ/ペンタブレット最適化（現状は Pointer Events 由来で動く可能性はあるが最適化はしていない）
- ペンの色/太さカスタマイズ
- CI (`.github/workflows/ci.yaml`) に test/lint/tsc を追加する（本 PR の後続タスク）
