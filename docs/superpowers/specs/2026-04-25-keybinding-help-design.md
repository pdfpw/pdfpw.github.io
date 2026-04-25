# キーバインドヘルプ 設計書

**作成日**: 2026-04-25
**ステータス**: ドラフト
**関連 issue**: [#8](https://github.com/pdfpw/pdfpw.github.io/issues/8)
**後続予定**: [#9](https://github.com/pdfpw/pdfpw.github.io/issues/9) (キーバインドのカスタマイズ) のデータ基盤を兼ねる

## 背景

現在 PDFPW には約 20 種類のキーボードショートカットが存在するが、UI 上に一切露出していない。

- ナビゲーション: `→` `←` `Space` `PageDown` `PageUp` `Home` `End` `↑` `↓` `Backspace` `g` (jump mode) `Shift+→/←`
- ツール: `L` (laser) `D` (pen) `E` (erase) `Esc` (exit tool)
- ビュー: `Tab` (overview) `f` (fullscreen)
- システム: `r` (reset timer)

これらの実装は3つのフックに分散しており、各ファイルで `event.key` の文字列がハードコードされている:

- `src/routes/-hooks/use-slide-shortcut.ts` (presenter のナビゲーション、wheel、jump mode)
- `src/routes/-hooks/use-tool-shortcut.ts` (両画面のツール)
- `src/routes/presentation/-hooks/use-presentation-shortcut.ts` (presentation のナビゲーション)
- `src/routes/presentation/index.tsx` (presentation 内の `f` `Tab` `Esc`)
- `src/components/OverviewDialog.tsx` (`Esc`)

ユーザーはこれらのキーを README やコードを読まないと知ることができず、実装した overview / blackout / pen / laser などの機能が発見されないまま使われない。

## ユースケース

1. **新規ユーザーの機能発見**: PDF を開いた直後に「Press `?` for keyboard shortcuts」というトーストで存在を知り、`?` を押して全ショートカットを確認できる。
2. **既存ユーザーのリファレンス**: 普段使うキーは覚えているが、たまに使う `Shift+→` (10 進む) や `g` (jump) を思い出すために `?` で素早く確認できる。
3. **講演前の準備**: 当日のオペレーションフローに合わせて使うキーを脳内整理するために一覧を眺める。

## スコープ

### In Scope

1. **キーバインドの単一ソース化**: 新規 `src/lib/keybindings.ts` にレジストリを定義。既存3フックは `matchAction()` ヘルパ経由でこのレジストリを参照する。
2. **ヘルプダイアログ**: Radix Dialog ベースのモーダルで、機能カテゴリ別 (Navigation / Tools / View / System) にショートカット一覧を表示。各行に Presenter / Audience の適用範囲バッジを表示。
3. **ショートカット**: `?` (Shift+/) と `F1` でダイアログを開く。`Esc` またはダイアログ外クリックで閉じる。
4. **発見性UI**:
   - プレゼンター画面ヘッダーに `?` アイコンボタン追加
   - プレゼンテーション画面の floating menu に `?` アイコンボタン追加
   - 初回トースト: 最初に PDF を開いてプレゼンター画面に遷移した際に1度だけ表示。`localStorage["pdfpw:keybinding-help-seen"]` で永続化
5. **既存フックの内部リファクタ**: `event.key` ハードコードを `matchAction(event)` に置換。**コールバック構造とフックの公開 API は維持**。

### Out of Scope

- キーバインドのカスタマイズ ([#9](https://github.com/pdfpw/pdfpw.github.io/issues/9) で別途)
- i18n ([#10](https://github.com/pdfpw/pdfpw.github.io/issues/10) で別途。本実装ではハードコードされた英語/日本語混在文字列を許容)
- マウスホイール操作のヘルプ表示 (キーボードヘルプ専用のため)
- ヘルプ内検索/フィルタ (~20 行のため YAGNI)
- ヘルプダイアログ内の「キーを押下してハイライト」のようなインタラクション
- 印刷可能なチートシート出力

## ユーザーストーリー

1. **初回利用**: 新規ユーザーが PDF を開いてプレゼンター画面に遷移すると、画面右下に「Press `?` for keyboard shortcuts」のトーストが 5 秒間表示される。閉じるボタンか `?` キー押下で消え、以降は表示されない。
2. **`?` でヘルプを開く**: ユーザーが `?` (Shift+/) または `F1` を押すと、画面中央に Radix Dialog でヘルプが表示される。再度 `?` または `Esc` で閉じる。
3. **ヘッダーから開く**: プレゼンター画面ヘッダーの右側 (`Licenses` リンク隣) にある `?` アイコンボタンをクリックしても同じダイアログが開く。
4. **プレゼンテーション画面から開く**: floating menu の左端 (page indicator の隣) にある `?` アイコンをクリックすると、プレゼンテーション画面でヘルプが開く。
5. **スコープ表示**: ヘルプの各行右端に `P` (Presenter) / `A` (Audience / Presentation) のバッジが表示され、どちらの画面で有効か一目でわかる。両画面で有効なキーは `P A` 両方が表示される。

## 設計詳細

### 1. キーバインドレジストリ

**新規ファイル**: `src/lib/keybindings.ts`

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
  | "view.close-overview"
  // system
  | "system.reset-timer"
  | "system.help";

export type Scope = "presenter" | "presentation" | "both";
export type Category = "navigation" | "tools" | "view" | "system";

export interface Binding {
  /** KeyboardEvent.key の値 (大文字小文字は match 時に正規化) */
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
  /** 主表示用ラベル (例: "Next slide") */
  readonly label: string;
  /** 補足説明 (任意、jump mode 等) */
  readonly hint?: string;
}

export const KEYBINDING_CATALOG: Record<ActionId, ActionDefinition> = {
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
  // ... (全 actions を定義)
};
```

### 2. matchAction ヘルパ

```ts
/**
 * KeyboardEvent をレジストリと照合し、マッチした ActionId を返す。
 * 同じキーが複数 action に紐づく場合、catalog の宣言順で先勝ち。
 * scope による絞り込みは呼び出し側で行う。
 */
export function matchAction(
  event: KeyboardEvent,
  scope: Scope,
): ActionId | null {
  for (const [actionId, def] of Object.entries(KEYBINDING_CATALOG)) {
    if (def.scope !== "both" && def.scope !== scope) continue;
    for (const binding of def.bindings) {
      if (matchBinding(event, binding)) return actionId as ActionId;
    }
  }
  return null;
}

function matchBinding(event: KeyboardEvent, binding: Binding): boolean {
  // 単一文字キーは大文字小文字を無視
  const eventKey = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;
  const bindingKey = binding.key.length === 1
    ? binding.key.toLowerCase()
    : binding.key;
  if (eventKey !== bindingKey) return false;
  if (!!binding.shift !== event.shiftKey) return false;
  if (!!binding.ctrl !== event.ctrlKey) return false;
  if (!!binding.alt !== event.altKey) return false;
  if (!!binding.meta !== event.metaKey) return false;
  return true;
}
```

**設計判断**:
- レジストリ側で scope を持つことで、`use-tool-shortcut` (両画面共通) と `use-slide-shortcut` (presenter 専用) のような scope の違いを表現できる
- shift/ctrl 等の修飾キーフラグを明示することで、`Shift+→` を `→` と区別できる (現状の実装でも区別している)
- 大文字小文字の正規化はキー文字 (1 文字) のみ。`ArrowRight` などの特殊キー名はそのまま比較

### 3. 既存フックの内部リファクタ

**方針**: フックの公開 API (引数のコールバック構造) は変更しない。内部の `switch (event.key)` を `switch (matchAction(event, scope))` に置換する。

#### `use-slide-shortcut.ts` (presenter, scope: "presenter")

```ts
const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
  if (event.defaultPrevented) return;

  // jump-to-slide モード中の処理は既存ロジックそのまま
  if (jumpToSlideModeRef.current) { /* unchanged */ return; }

  const action = matchAction(event, "presenter");
  if (!action) return;

  switch (action) {
    case "slide.next":
      event.preventDefault();
      callbacks.moveNextSlide();
      break;
    case "slide.next-10":
      event.preventDefault();
      callbacks.moveNext10Slides();
      break;
    // ... 全 action に対応
  }
});
```

**注意**: `Shift+→` は `slide.next-10` action として独立定義する。レジストリ側で `{ key: "ArrowRight", shift: true }` と `{ key: "ArrowRight" }` を分離。`matchBinding` の修飾キー比較は **完全一致** (`!!binding.shift !== event.shiftKey` でリジェクト) のため、`{ key: "ArrowRight" }` は shift 非押下時のみマッチする。宣言順への依存はない。

#### `use-tool-shortcut.ts` (両画面, scope: 呼び出し側依存)

```ts
export function useToolShortcut(
  fileName: string,
  pairId: string,
  selfSide: ToolSide,  // "presenter" | "presentation"
): void {
  // ...
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (isInputTarget(event.target)) return;

    const action = matchAction(event, selfSide);
    if (!action) return;
    // switch on action ...
  });
}
```

`selfSide` を `Scope` として渡す。

#### `use-presentation-shortcut.ts` (presentation, scope: "presentation")

同様に書き換え。

#### `presentation/index.tsx` の `f` / `Tab` / `Esc` 処理

`use-presentation-view-shortcut.ts` のような小さなフックに切り出して `matchAction` 経由に統一する **か**、現状の手書き処理のままにするか。後者は YAGNI 寄りだが、ヘルプレジストリとの drift リスクが残る。

**判断**: フックに切り出して統一する。`f` (fullscreen) と `Tab` (overview toggle) と `Esc` (close overview) はレジストリに登録し、フックで照合する。

#### `OverviewDialog.tsx` の `Esc`

これは「ダイアログ内のローカル動作」であり、グローバルキーバインドではない (Radix Dialog の機能でも処理可能)。レジストリには載せず、現状維持とする。`Esc` for overview close はレジストリ上 `view.close-overview` action として登録するが、ハンドリングは presentation/index.tsx に残す。

### 4. ヘルプダイアログコンポーネント

**新規ファイル**: `src/components/KeybindingHelpDialog.tsx`

Radix Dialog を使用。既存の `LibrarySection` の dialog や `OverviewDialog` と一貫した見た目 (`bg-overlay/90 backdrop-blur-md`、cyan focus ring 等)。

```tsx
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeybindingHelpDialog({ open, onOpenChange }: Props) {
  const groupedActions = useMemo(() => groupByCategory(KEYBINDING_CATALOG), []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        {(["navigation", "tools", "view", "system"] as const).map((cat) => (
          <Section key={cat} title={CATEGORY_LABELS[cat]}>
            {groupedActions[cat].map((action) => (
              <ShortcutRow key={action.id} action={action} />
            ))}
          </Section>
        ))}
        <DialogFooter>
          <p className="text-muted text-xs">Press ? again or Esc to close</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**ShortcutRow** は1つの action に対し:
- 左: `<Kbd>` コンポーネントで `bindings` を順に表示。`Shift+→` のような修飾キー付きは `<Kbd>Shift</Kbd> + <Kbd>→</Kbd>` で組み立て
- 中: `label` (`hint` があれば1行下に小さく表示)
- 右: scope バッジ (`P` / `A` / `P A`)

**Kbd コンポーネント** (新規 `src/components/ui/kbd.tsx`): Geist Mono フォント、`bg-raised border` の小さなキーキャップ風 UI。キー名は人間可読に変換 (`ArrowRight` → `→`、`" "` → `Space`、`PageDown` → `PgDn` など)。

### 5. ヒントトースト

**新規ファイル**: `src/components/KeybindingHintToast.tsx`

プレゼンター画面の右下に floating で表示される小さな通知。既存の `UpdateToast.tsx` のスタイルを踏襲。

**表示条件**:
- プレゼンター画面 (`/presenter`) にいる
- PDF が読み込まれた後 (`pdfProxyAtom` が解決済み)
- `localStorage["pdfpw:keybinding-help-seen"]` が未設定

**dismiss 条件** (いずれかで `localStorage` フラグを立てて以後表示しない):
- ユーザーが `?` または `F1` でヘルプを開く
- ユーザーがトーストの閉じるボタンを押す
- ユーザーがヘルプダイアログのヘッダーアイコンを押す
- 5 秒経過 (auto-dismiss する場合は別途検討。デフォルトは手動 dismiss のみ)

**判断**: auto-dismiss はしない。dismiss するとフラグが立つ仕様だと、ユーザーが見ていない間に消えてしまうと「見逃したまま再表示されない」になる。手動 dismiss にすることで「ユーザーが認識した」を保証する。

### 6. use-keybinding-help フック

**新規ファイル**: `src/hooks/use-keybinding-help.ts`

```ts
const HELP_SEEN_KEY = "pdfpw:keybinding-help-seen";

export function useKeybindingHelp(scope: Scope): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  shouldShowHint: boolean;
  dismissHint: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [helpSeen, setHelpSeen] = useLocalStorageSync(HELP_SEEN_KEY, "0");

  const open = useCallback(() => {
    setIsOpen(true);
    if (helpSeen !== "1") setHelpSeen("1");
  }, [helpSeen, setHelpSeen]);
  const close = useCallback(() => setIsOpen(false), []);
  const dismissHint = useCallback(() => setHelpSeen("1"), [setHelpSeen]);

  // ?/F1 グローバルキー監視
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (isInputTarget(e.target)) return;
      const action = matchAction(e, scope);
      if (action === "system.help") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (helpSeen !== "1") setHelpSeen("1");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scope, helpSeen, setHelpSeen]);

  return {
    isOpen,
    open,
    close,
    shouldShowHint: helpSeen !== "1",
    dismissHint,
  };
}
```

`use-local-storage-sync.ts` は既存のものを利用。

### 7. Header / Floating menu 統合

#### Header (presenter 画面)

`src/components/Header.tsx` を修正し、`Licenses` リンクの隣に `?` アイコンボタンを追加。`presenter.tsx` 側で `useKeybindingHelp("presenter")` を呼び、Header に `onHelpClick` プロパティとして渡す。

ただし、現状の Header は `(main)` ルートグループ全体で共有されており、ランディング画面でも表示される。ランディング画面では `?` アイコンを表示しない方針 (キーバインドが無効なため)。これは `useRouterState` でルートを判定する。

#### Floating menu (presentation 画面)

`src/routes/presentation/index.tsx` の floating menu に `?` ボタンを追加。menu の左端、page indicator の隣 or 既存ボタン群と同列に配置。

### 8. データモデル: KEYBINDING_CATALOG 全 entries

| ActionId | category | scope | bindings | label |
|---|---|---|---|---|
| `slide.next` | navigation | both | `→`, `Space`, `PageDown` | Next slide |
| `slide.prev` | navigation | both | `←`, `PageUp` | Previous slide |
| `slide.next-user` | navigation | presenter | `↓` | Next slide group |
| `slide.prev-user` | navigation | presenter | `↑` | Previous slide group |
| `slide.next-10` | navigation | presenter | `Shift+→`, `Shift+PageDown` | Skip 10 forward |
| `slide.prev-10` | navigation | presenter | `Shift+←`, `Shift+PageUp` | Skip 10 backward |
| `slide.first` | navigation | both | `Home` | Jump to first |
| `slide.last` | navigation | both | `End` | Jump to last |
| `slide.history-back` | navigation | presenter | `Backspace` | Navigate back |
| `slide.jump-mode` | navigation | presenter | `g` | Jump to slide N (then digits, Enter) |
| `tool.laser` | tools | both | `l` | Toggle laser pointer |
| `tool.pen` | tools | both | `d` | Toggle pen |
| `tool.erase` | tools | both | `e` | Erase pen drawings |
| `tool.exit` | tools | both | `Esc` | Exit tool / close dialog |
| `view.overview` | view | both | `Tab` | Toggle overview |
| `view.fullscreen` | view | presentation | `f` | Toggle fullscreen |
| `system.reset-timer` | system | presenter | `r` | Reset timer |
| `system.help` | system | both | `?`, `F1` | Show keyboard help |

**`Esc` キーの扱い**:

`Esc` は context によって複数の役割を持つ (ツール終了 / overview 閉じる / help 閉じる / jump-mode キャンセル)。レジストリでは `tool.exit` のみ登録し、他のコンポーネント (`OverviewDialog` 内の Esc、help dialog の Esc) は各コンポーネントが内部で処理する。これは Radix Dialog の標準挙動とも整合する。

ヘルプ画面の表示ラベルは `Esc` 行を `tools` カテゴリに1度のみ表示し、label を「Exit tool / close dialog」とする (補足 hint で複数の役割があることを示す)。

**`?` のバインディング**:

`?` は `Shift + /` で生成される文字。`KeyboardEvent.key` は `"?"` を返すため、`{ key: "?" }` をそのまま登録すれば良い (shift フラグは不要)。`F1` は `{ key: "F1" }`。

**1文字キーの正規化**:

`matchBinding` が単一文字キーを `toLowerCase()` で正規化するため、レジストリは小文字で統一して記述する (`"l"`, `"d"`, `"e"`, `"r"`, `"f"`, `"g"`)。

### 9. UI レイアウト

```
┌─ Keyboard Shortcuts ──────────────────── × ┐
│                                            │
│ NAVIGATION                                 │
│   →  Space  PgDn          Next slide   P A │
│   ←  PgUp                 Previous     P A │
│   ↑                       Prev group   P   │
│   ↓                       Next group   P   │
│   Home                    First slide  P A │
│   End                     Last slide   P A │
│   Shift + →               Skip 10 fwd  P   │
│   Shift + ←               Skip 10 bwd  P   │
│   Backspace               Navigate back P  │
│   g                       Jump to N    P   │
│                           (then digits, Enter) │
│                                            │
│ TOOLS                                      │
│   L                       Laser        P A │
│   D                       Pen          P A │
│   E                       Erase pen    P A │
│   Esc                     Exit tool    P A │
│                                            │
│ VIEW                                       │
│   Tab                     Overview     P A │
│   F                       Fullscreen     A │
│                                            │
│ SYSTEM                                     │
│   R                       Reset timer  P   │
│   ?  /  F1                Show help    P A │
│                                            │
│         Press ? again or Esc to close      │
└────────────────────────────────────────────┘
```

scope バッジは色付き (`text-accent` for active scope) の小さい丸文字または pill。

### 10. ファイル構成

| 種別 | パス | 役割 |
|---|---|---|
| 新規 | `src/lib/keybindings.ts` | レジストリ + `matchAction` |
| 新規 | `src/components/KeybindingHelpDialog.tsx` | ダイアログ本体 |
| 新規 | `src/components/KeybindingHintToast.tsx` | 初回ヒント |
| 新規 | `src/components/ui/kbd.tsx` | キーキャップ表示コンポーネント |
| 新規 | `src/hooks/use-keybinding-help.ts` | open/close + localStorage |
| 新規 | `src/routes/presentation/-hooks/use-presentation-view-shortcut.ts` | `f` / `Tab` の責務切り出し |
| 修正 | `src/routes/-hooks/use-slide-shortcut.ts` | `matchAction` 経由に書き換え |
| 修正 | `src/routes/-hooks/use-tool-shortcut.ts` | 同上、`scope` 引数追加 |
| 修正 | `src/routes/presentation/-hooks/use-presentation-shortcut.ts` | 同上 |
| 修正 | `src/routes/presentation/index.tsx` | `f`/`Tab`/`Esc` をフックに移譲、ヘルプ統合 |
| 修正 | `src/routes/(main)/presenter.tsx` | `useKeybindingHelp`、Dialog/Toast マウント |
| 修正 | `src/components/Header.tsx` | `?` アイコンボタン (presenter ルートのみ) |

### 11. テスト方針

`vitest` で以下をカバー:

1. **`matchAction` のユニットテスト** (`src/lib/__tests__/keybindings.test.ts`)
   - 各 action のバインディングが正しくマッチする
   - scope の絞り込みが効く (presenter scope で `f` は null を返す等)
   - 修飾キーの区別 (`Shift+→` と `→` が別 action)
   - 大文字小文字の正規化 (`L` と `l` が同一 action)
   - 未定義キーは null
2. **`use-keybinding-help` のユニットテスト** (`src/hooks/__tests__/use-keybinding-help.test.ts`)
   - `?` 押下で isOpen が true になる
   - `?` を再度押下で false に戻る
   - 初回 open で `localStorage` に "1" が書かれる
   - INPUT 要素にフォーカス時はトリガーしない
3. **手動テスト**:
   - 全ショートカットが書き換え後も動作する (リグレッションチェック)
   - ヘルプダイアログがダーク/ライト両モードで表示される
   - 初回トーストが localStorage クリア後に再表示される

### 12. 影響範囲

- **既存テスト**: navigation-utils と pointer-state のテストは独立しており影響なし
- **既存フック API**: 変更なし。コールバック構造を維持するため、呼び出し側 (`presenter.tsx` 等) の修正は不要
- **i18n ([#10](https://github.com/pdfpw/pdfpw.github.io/issues/10)) との関係**: `label` / `hint` は将来的に i18n キーに置換できる構造を意識する (フラットな文字列)。今回は英語ハードコードで先行
- **カスタマイズ ([#9](https://github.com/pdfpw/pdfpw.github.io/issues/9)) との関係**: `KEYBINDING_CATALOG` の `bindings` を `defaultBindings` にリネームし、ユーザー設定の `userBindings` を上書きする層を `matchAction` の手前に挿入することで対応可能。今回はその層を入れない

## オープンクエスチョン

- ランディング画面で `?` を押した時の挙動: ヘルプを表示しない (presenter/presentation でのみ有効)
- `system.help` の key として `Shift+/` (= `?`) と `F1` の両方を登録: F1 はブラウザのデフォルト挙動 (Chrome のヘルプ表示) と競合しないか確認が必要。Chrome は F1 を特に予約していないが、要動作確認

## 後続タスク (本 spec 範囲外)

- [#9](https://github.com/pdfpw/pdfpw.github.io/issues/9): キーバインドのカスタマイズ。本 spec のレジストリを `defaultBindings` として扱い、`userBindings` の override 層を追加
- [#10](https://github.com/pdfpw/pdfpw.github.io/issues/10): i18n。`label` / `hint` を i18n キー化
