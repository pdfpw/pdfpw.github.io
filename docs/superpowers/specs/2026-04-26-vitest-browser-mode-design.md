# Vitest Browser Mode 導入設計

## 概要

Vitest 3.2.4 + jsdom 環境から Vitest 4.1.5 + 実ブラウザ（Playwright / Chromium）環境へ移行する。
全テストをブラウザ環境に統一し、jsdom との差異を排除する。

## アプローチ

`vite.config.ts` の `test` セクションをブラウザモードに直接移行する（設定ファイルの分離なし）。

## パッケージ変更

### 追加

| パッケージ | バージョン | 用途 |
|---|---|---|
| `@vitest/browser-playwright` | `4.1.5` | Vitest 4 の Playwright プロバイダー |
| `vitest-browser-react` | `2.2.0` | ブラウザモード用 React Testing Library 統合 |

### 削除

| パッケージ | 理由 |
|---|---|
| `jsdom` | ブラウザモードでは不要 |
| `@testing-library/react` | `vitest-browser-react` に置き換え |
| `@testing-library/dom` | 不要 |
| `@testing-library/jest-dom` | ブラウザモードでは不要 |

### アップグレード

| パッケージ | 変更前 | 変更後 |
|---|---|---|
| `vitest` | `3.2.4` | `4.1.5` |

## 設定変更

### `vite.config.ts`

```diff
+import { playwright } from '@vitest/browser-playwright'

 test: {
   globals: true,
   setupFiles: ["./src/test-setup.ts"],
-  environment: "jsdom",  // (各テストファイルの @vitest-environment jsdom も削除)
+  browser: {
+    provider: playwright(),
+    instances: [{ browser: "chromium" }],
+  },
 },
```

## テストファイルの変更

### 全テストファイル

`// @vitest-environment jsdom` アノテーションを削除する。

対象ファイル:
- `src/lib/pointer-state.test.ts`
- `src/lib/navigation-utils.test.ts`
- `src/lib/keybindings.test.ts`
- `src/lib/format.test.ts`
- `src/lib/i18n.test.ts`
- `src/lib/thumbnail.test.ts`
- `src/components/LocaleSwitcher.test.tsx`
- `src/hooks/use-theme.test.ts`
- `src/hooks/use-keybinding-help.test.ts`
- `src/routes/index.test.tsx`

### `src/components/LocaleSwitcher.test.tsx`

```diff
-import { fireEvent, render, screen } from '@testing-library/react'
+import { render } from 'vitest-browser-react'
```

- `render()` は `await` が必要（`Promise<{ getByRole, ... }>` を返す）
- `screen.getByRole(...)` → `render` の戻り値（Locator）から取得
- `fireEvent.click(...)` → `await locator.click()`（Locator の `.click()` メソッドを使用）
- `userEvent` は不要（Locator API で直接操作可能）

### `src/lib/thumbnail.test.ts`

実ブラウザの Canvas API が使えるため以下を削除:
- `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` モック
- `vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')` モック

PDF.js (`getDocument`) のモックは引き続き維持する（実 PDF ロードではなくユニットテストのため）。

### `src/test-setup.ts`

`@testing-library/jest-dom/vitest` のインポートを削除する。ファイル自体は将来のグローバル設定用に空ファイルとして残す。

## 注意点

- `thumbnail.test.ts` の Canvas モック削除により `toDataURL` の戻り値が変わる。実ブラウザでは空 Canvas の `toDataURL("image/jpeg")` が実際の JPEG data URL を返す。`getDocument` は引き続きモックするため Canvas には何も描画されないが、戻り値は `"data:image/jpeg;base64,<実値>"` になる。現在の `expect(result).toBe("data:image/jpeg;base64,abc")` を `expect(result).toMatch(/^data:image\/jpeg;base64,/)` に変更する。

## テスト戦略

移行後も既存テストのカバレッジ・意図を維持する。Canvas モック削除分は実ブラウザの挙動に合わせてアサーションを調整する。
