# Presentation 画面操作とポインターツール 設計書

**作成日**: 2026-04-24
**ステータス**: ドラフト

## 背景

PDFPW は現在、presentation 画面（観客向け）が完全に受動的である。presentation 側で可能なのは以下のローカル操作のみ:

- `f`: フルスクリーン切替
- `Tab` / `Escape`: オーバービュー開閉

ページ送り、ブラックアウト、各種ツール操作は全て presenter 側で行う必要がある。また、ポインターツール（レーザー/ペン）が存在せず、ユーザーはカーソルでスライド内を指し示そうとするが、`pointermove` でメニューが自動表示されるため UX を損ねている。

## ユースケース

プレゼンター自身が通常は presenter 画面で操作するが、いざという時に presentation 画面側でもページ送りできる**冗長性を確保する**（バックアップ操作）。会場オペレータ補助や シングルディスプレイ運用はスコープ外。

ポインターは **双方向同期モデル**: どちらの画面で操作しても、相手側にも同じポインター表示が出る。

## スコープ

### In Scope

1. presentation 画面での基本ページ送り（Space / 矢印 / PageUp/Down / Home / End）
2. レーザーポインター（`L` トグル）
3. ペンツール（`D` トグル、赤 3px 固定、ページ遷移でクリア、`E` で手動クリア）
4. ポインター/ペン中は presentation 側メニューの自動表示を抑制
5. ナビゲーション解決ロジックを共通化し、初のユニットテストを導入

### Out of Scope

- presentation 側からのブラックアウト/ホワイトアウト/フリーズ操作
- タッチ/ペンタブレット入力
- ペンの色/太さカスタマイズ、ハイライター
- 終了時のインク保存ダイアログ（PowerPoint 風）
- ペン描画の PDF エクスポート
- 他ユーザー操作（オーバービュー、ジャンプ入力）の presentation 側での完全再現

## ユーザーストーリー

1. **バックアップ操作**: presenter 画面のブラウザがクラッシュ/応答不能になった際、プレゼンターは presentation 画面にフォーカスを移し、`Space` や矢印キーでページ送りを継続できる。
2. **レーザーポインター**: プレゼンターが `L` を押すと、自分のカーソル位置にレーザードットが表示され、同時に presentation 画面にも同位置（正規化座標）でレーザードットが同期表示される。もう一度 `L` または `Esc` で OFF。
3. **ペン**: `D` でペンモードに入り、クリック&ドラッグで赤い線を描く。描画は両画面に同期。ページを変えると自動クリア。`E` で即座にクリア。
4. **メニュー抑制**: ツールモード中は presentation 画面の自動表示メニューが出ない。カーソル移動でメニューに邪魔されずに指し示せる。

## 設計詳細

### 1. Broadcast プロトコル拡張

全て `src/broadcast/types.ts` のグローバル宣言拡張パターンに合わせて追加する。以下のコマンドは **双方向**（presenter/presentation どちらからでも送信可能）とし、`from` フィールドで送信元を判別する。

| コマンド | ペイロード | 意味 |
|---|---|---|
| `navigate` | `{ direction: "next" \| "prev" \| "home" \| "end" }` | ページ送り要求（通常は presentation → presenter） |
| `tool-mode` | `{ mode: "none" \| "laser" \| "pen" }` | ツールモードの同期 |
| `pointer-move` | `{ x: number; y: number }` | スライド領域内の正規化座標（0-1） |
| `pointer-leave` | `{}` | カーソルがスライド領域外へ |
| `pen-stroke-start` | `{ strokeId: string; x: number; y: number }` | ペンストローク開始点 |
| `pen-stroke-point` | `{ strokeId: string; x: number; y: number }` | ストローク中の追加点 |
| `pen-stroke-end` | `{ strokeId: string }` | ストローク終了 |
| `pen-clear` | `{}` | ペン描画全消去 |

**型定義の配置**:

既存の `PresenterCommandMap` / `PresentationCommandMap` は送信元を型レベルで分けているが、双方向コマンドは**両方のマップに同じ形で宣言**する。これにより `from` の型制約は既存のままで、どちら側からも送信できるようになる。

**正規化座標の定義**:

スライド表示領域（黒帯を除いた実際の PDF ページが描画されている矩形）の左上を `(0, 0)`、右下を `(1, 1)` とする。受信側は自分の表示サイズに合わせてスケールする。両画面でアスペクト比は同じ（同一 PDF）なので位置ズレは起きない。

**送信元自身へのエコー**:

ツール操作は送信側の画面にも表示される必要がある。実装方針は「送信側は自分の local state を直接更新し、同時に broadcast する」。受信側は broadcast から state を更新する。結果として両画面が同じ state を持つ。

### 2. Presentation 側ページ送り

**新規フック**: `src/routes/presentation/-hooks/use-presentation-shortcut.ts`

```
Space / → / PageDown  → navigate { direction: "next" }
← / PageUp            → navigate { direction: "prev" }
Home                  → navigate { direction: "home" }
End                   → navigate { direction: "end" }
```

既存のローカル処理 (`f`, `Tab`, `Escape`) は `presentation/index.tsx` に残す。

`navigate` の direction は `"next" | "prev" | "home" | "end"` の4値のみ。ArrowUp/Down（ユーザースライド単位移動）、`g` ジャンプ、Shift+矢印（10スキップ）、Backspace（履歴戻り）は presentation 側では**実装しない**（バックアップ用途の最小セット Q4=B に準拠）。必要になれば後続タスクで `"next-user" | "prev-user"` 等を追加する。

**presenter 側の解決**:

presenter が `navigate` を受信したら、新規 `src/lib/slide-navigation.ts` の helper で次/前ページ番号を算出し、既存の `setPageNumberWithBroadcast(resolvedPage)`（`src/routes/(main)/presenter.tsx:126` 付近）を呼ぶ。このヘルパーは atom 更新と `send-current-page-number` 送信を既にまとめて行うため、新規 effect は不要。

**slide-navigation.ts の API**:

```typescript
resolveNextPage(config, currentPageNumber): number
resolvePrevPage(config, currentPageNumber): number
resolveNextUserSlide(config, currentPageNumber): number  // ArrowDown 相当（オーバーレイグループの次へ）
resolvePrevUserSlide(config, currentPageNumber): number  // ArrowUp 相当
resolveFirstSlide(config): number
resolveLastSlide(config): number
```

overlay/グループ化を考慮する。現行の navigate ロジックは `src/routes/(main)/presenter.tsx` 内に定義された `getNextPageNumber`/`movePrevSlide`/`moveNextUserSlide`/`movePrevUserSlide` 等のコールバック実装として存在するため、その純粋関数部分をこのファイルへ抽出する（`useSlideShortcut` は callback 受け取り方式を維持、callback 内でヘルパーを呼ぶ形になる）。

### 3. ポインターツール

**新規状態**（`src/lib/pointer-state.ts`）:

```typescript
toolModeAtom: atom<"none" | "laser" | "pen">("none")
laserPosAtom: atom<{ x: number; y: number } | null>(null)
penStrokesAtom: atom<Array<{ id: string; points: Array<{x: number; y: number}> }>>([])
```

**描画コンポーネント**: `src/components/PointerOverlay.tsx`

- slide 表示領域に `absolute inset-0` で重なる SVG
- laser: `<circle r=8 fill="#ef4444" opacity=0.7 style={{ mixBlendMode: "multiply" }} />`
- pen: `<polyline>` per stroke, stroke=#ef4444, strokeWidth=3, strokeLinecap=round, strokeLinejoin=round, fill=none
- `pointerEvents: "none"`（下の PDF/UI を邪魔しない）
- props: `toolMode`, `laserPos`, `strokes`, コンテナサイズ（正規化 → ピクセル変換用）

**キーバインド**（presenter/presentation 共通の新規 hook 化 or 各側で重複実装）:

- `L`: `toolMode` を `laser` ↔ `none` トグル
- `D`: `toolMode` を `pen` ↔ `none` トグル
- `E`: `pen-clear` 送信（モード問わず実行可能）
- `Esc`: `toolMode` を `none` へ

トグル時は `tool-mode` broadcast で相手側にも同期。

**ポインター入力**:

- `toolMode === "laser"`: slide 領域で `pointermove` を rAF スロットル → `pointer-move` broadcast + local atom 更新
- `toolMode === "pen"`:
  - `pointerdown`: `strokeId = crypto.randomUUID()`, 新規ストロークを local に push + `pen-stroke-start` broadcast
  - `pointermove`（down 中）: rAF で最新点を local stroke に追加 + `pen-stroke-point` broadcast
  - `pointerup`: `pen-stroke-end` broadcast
  - mouse/pen 左ボタンのみ反応。右クリックやホイールは無視
- `pointerleave` (slide 領域): `pointer-leave` broadcast、local laserPos を null

**rAF スロットル**:

`useRef` で pending 座標を保持、`requestAnimationFrame` 内で最新値を 1 回だけ送る。フレーム内の複数 pointermove は最後の値だけが送信される。

**ペン自動クリア**:

presenter 側の `pageNumberAtom` 変化を検知する effect で `pen-clear` を broadcast + local strokes クリア。

### 4. メニュー抑制

`src/routes/presentation/-Menu.tsx` を修正:

- `toolModeAtom` を購読
- `toolMode !== "none"` の間は `pointermove` / `pointerdown` リスナーを停止
- メニューの表示 state を強制的に `false` に
- 解除時は通常動作に戻る

### 5. アーキテクチャ / ファイル変更

**新規**:

- `src/lib/slide-navigation.ts` — ナビゲーション解決 + 単体テスト
- `src/lib/slide-navigation.test.ts` — vitest
- `src/lib/pointer-state.ts` — atoms
- `src/lib/pointer-state.test.ts` — vitest（純粋 state ロジックのみ）
- `src/components/PointerOverlay.tsx`
- `src/broadcast/tools.ts` — ツール系フック `useToolBroadcast`（双方向送受信）
- `src/routes/presentation/-hooks/use-presentation-shortcut.ts`
- `src/routes/-hooks/use-tool-shortcut.ts` — `L`/`D`/`E`/`Esc` を両画面共通で処理

**修正**:

- `src/broadcast/types.ts` — 双方向コマンド型を追加
- `src/broadcast/presenter.ts` — `navigate` 受信 → ナビ解決、ツール系コマンド受信
- `src/broadcast/presentation.ts` — ツール系コマンド受信、navigate 送信 helper
- `src/broadcast/index.ts` — 新フックの re-export
- `src/routes/-hooks/use-slide-shortcut.ts` — ナビゲーションを `slide-navigation.ts` へ委譲、`L`/`D`/`E`/`Esc` は新 `use-tool-shortcut.ts` へ切り出し
- `src/routes/(main)/-presenter/*` — `PointerOverlay` を PdfPage 上に重ねる配置、ツールフック呼び出し
- `src/routes/presentation/index.tsx` — `use-presentation-shortcut` 呼び出し、`PointerOverlay` 追加、ツールフック呼び出し
- `src/routes/presentation/-Menu.tsx` — `toolMode` 購読、suppression

### 6. データフロー

**ページ送り（presentation 起点）**:

```
presentation: Space 押下
  → useToolBroadcast (or usePresentationShortcut) が navigate { direction: "next" } を broadcast
presenter: 受信
  → resolveNextPage(config, currentPage) で次ページ番号を算出
  → pageNumberAtom 更新
  → 既存の「atom → broadcast」effect が send-current-page-number を送信
presentation: 受信
  → local pageNumber atom 更新、再レンダリング
```

**ポインター（レーザー）**:

```
active 側: pointermove (slide 領域内、toolMode === "laser")
  → rAF throttle → 正規化座標算出
  → local laserPosAtom 更新 (即座に自画面に描画)
  → pointer-move broadcast
相手側: 受信
  → laserPosAtom 更新 → PointerOverlay 再描画
```

**ペン**:

```
active 側: pointerdown (pen mode)
  → strokeId = crypto.randomUUID()
  → local strokes に新規 stroke push
  → pen-stroke-start broadcast
  pointermove: local stroke に point 追加 (rAF) + pen-stroke-point broadcast
  pointerup: pen-stroke-end broadcast
ページ遷移時: active 側
  → local strokes クリア
  → pen-clear broadcast
相手側: 同じ流れで state 同期
```

### 7. エラーハンドリング / エッジケース

- **両画面で同時にポインター操作**: 最後の更新が勝つ（`laserPosAtom` は単一値）。実用上同時操作は稀で問題にならない
- **stroke-start 未到着で stroke-point が先着**: 受信側で strokeId が不明なら新規 stroke を作成して point を追加（順序逆転耐性）
- **stroke-end が届かない（タブクローズ等）**: stroke は残るが、ページ遷移や `E` で消えるので実害なし
- **presentation → presenter の navigate 受信失敗**: presenter 側の atom は変化せず、presentation も自身の local state を変えない（presenter がソースオブトゥルース）。BroadcastChannel は同一オリジンの同一ブラウザ内で信頼できる前提
- **ツールモード解除漏れ**: `Esc` で常時 `none` へ戻せる。メニュー抑制もこれで解除
- **スライド領域外のポインター**: `pointerleave` で laser を隠す。ペン中は `pointerleave` でストローク終了扱い

### 8. テスト戦略

プロジェクト初のテスト導入。vitest（既に `devDependencies` に設定済みのはずなので確認、無ければ追加）。

**対象**:

1. `slide-navigation.test.ts`
   - 通常ページの next/prev
   - pdfpc overlay グループ内でのジャンプ（グループの次の先頭へ飛ぶ）
   - 先頭で prev / 末尾で next の境界
   - Home / End
2. `pointer-state.test.ts`
   - stroke 追加/終了、clear
   - tool-mode 遷移、Esc で none へ
3. （将来）broadcast contract test: コマンド型の round-trip

**CI 追加**: `.github/workflows/ci.yaml` に `pnpm test` と `pnpm tsc -b` ステップを追加（別タスクだが本プランと同時に実施する）。

### 9. 非機能要件

- **パフォーマンス**: pointer-move/pen-stroke-point は rAF スロットル済み。broadcast payload は軽量 (<100 bytes/msg)
- **アクセシビリティ**: 本設計ではツール起動のための UI ボタンは追加しない（キーボードのみ）。UI 追加は将来の別タスクとし、その時点で `aria-keyshortcuts` 対応を行う
- **ブラウザ互換**: `crypto.randomUUID` は全モダンブラウザで利用可。`mix-blend-mode` も同様

## リスクと代替案

- **双方向同期の競合**: 片方向（presenter が常にソース）の方が単純。ただしユーザー要望により双方向採用
- **tool-mode の同期が実質必要か**: 同期しない選択肢もあり（各画面で独立モード）。だが「L を押したら両画面のメニューが消える」など統一挙動が自然なため同期する
- **ナビゲーション解決を presentation 側でも行う案**: 設定を両側が持つので可能だが、ソースオブトゥルース二重化のリスクがあるため却下。常に presenter が解決

## 完了条件

- [ ] presentation 画面で Space/矢印/PageUp/Down/Home/End でページが進む
- [ ] `L` でレーザーが両画面に出る、もう一度で消える
- [ ] `D` でペンが両画面に描画される、ページ遷移で自動クリア、`E` で手動クリア
- [ ] ツール中は presentation メニューが自動表示されない
- [ ] `slide-navigation.ts` の単体テストが通る
- [ ] `pnpm tsc -b` / `pnpm lint` / `pnpm test` が通る
