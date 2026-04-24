# PDFPW 全体リデザイン 設計書

**作成日**: 2026-04-24
**ステータス**: ドラフト

## 背景

PDFPW は現在、Tailwind v4 + Radix UI + CVA + OKLch トークンで構築された汎用的な「モダンミニマル」UI を持つ。機能は揃っているが、ビジュアル面では個性が弱く、ランディング画面はプロダクトが何であるかを初訪問者に伝えられていない (ヒーローに "Web-based Presenter Tool" とあるのみで機能説明がない)。また、現状はダーク/ライト両対応ながらテーマ切替 UI は存在しない。

本リデザインは、全画面 (ランディング / プレゼンター / プレゼンテーション / ヘッダー / 共通コンポーネント) を一貫したビジュアル方向へ刷新し、初訪問者にもプロダクト理解を促す。ただし **プレゼンター画面の 3 エリア構成と構造的レスポンシブ挙動は維持する** (過去の方針に基づく)。

## デザイン方向性

**コンセプト**: "Technical Precision" — 深いダーク基調 + 冷たく清涼な cyan アクセント。Linear / Vercel に近い、静謐で精密な技術者向けアプリの空気感。

- ダーク既定 (プレゼン文脈と相性)、ライトも対応。OS 設定に加え、ヘッダー上のトグルで手動切替可能。
- キーボード中心の使用感を前提とする (`⌘+O` 等をコピー内で補助表示)。
- プレゼン中は視線がスライドに向かうことを前提に、UI クロームは控えめにする。

## スコープ

### In Scope

1. デザイントークン刷新 (カラー、半径、影、余白、タイポグラフィ)
2. グローバル CSS (`src/styles.css`) の書き換えと Tailwind v4 テーマインラインの再定義
3. フォント導入 (Geist / Geist Mono)
4. ライト/ダークテーマトグル (ヘッダーに追加)
5. ランディング画面の情報設計刷新 (Editorial split + How-it-works セクション + 整備された Library)
6. プレゼンター画面のビジュアル刷新 (3 エリア構成維持、Card-based surface)
7. プレゼンテーション画面の Menu / OverviewDialog ビジュアル刷新
8. 共通コンポーネント (`src/components/ui/*`) の variant 再定義 (Button / Card / Dialog / Switch / Skeleton)
9. ヘッダー再設計 (ロゴ / ナビ / テーマトグル / GitHub リンク)

### Out of Scope

- 3 エリア構成自体の変更 (memory に従い構造不変)
- broadcast プロトコル変更 / PDF レンダリングパイプライン変更
- 多言語対応追加 (現状のまま)
- マーケティング用の FAQ / 動画 / 外部 CTA セクション
- ロゴデザインの刷新 (暫定で小さな cyan 角丸アイコンとする)
- 新規機能追加 (検索、タグ、ワークスペース等)

## デザイントークン

### カラー (ダーク既定)

```
--bg:           #070709   /* ページ背景 */
--surface:      #0B0B0F   /* パネル背景 */
--raised:       #12121A   /* カード・raised 面 */
--overlay:      #1C1C24   /* popover / dropdown */

--fg:           #F5F5F7   /* 主要テキスト */
--muted:        #A8A8B2   /* 補助テキスト */
--subtle:       #6A6A75   /* メタ・プレースホルダー */
--border:       rgba(255,255,255,0.08)
--border-strong:rgba(255,255,255,0.14)

--accent:       #06B6D4   /* primary button, link, focus */
--accent-hi:    #22D3EE   /* hover */
--accent-lo:    #0891B2   /* pressed */
--accent-soft:  rgba(6,182,212,0.10)

--danger:       #EF4444
--warning:      #F59E0B   /* timer: too-slow */
--success:      #10B981   /* timer: pretalk */
--info:         #38BDF8   /* timer: too-fast */
```

### カラー (ライト対応)

```
--bg:           #FAFAFA
--surface:      #FFFFFF
--raised:       #FFFFFF
--overlay:      #FFFFFF

--fg:           #0B0B0F
--muted:        #52525B
--subtle:       #A1A1AA
--border:       rgba(0,0,0,0.08)
--border-strong:rgba(0,0,0,0.14)

--accent:       #0891B2   /* ライトでは -lo を primary に */
--accent-hi:    #06B6D4
--accent-lo:    #0E7490
--accent-soft:  rgba(8,145,178,0.08)

/* danger / warning / success / info はダークと同色 */
```

既存の `styles.css` は OKLch を使っているが、本件では素朴な HEX / rgba に切り替える (ブランドカラー cyan は意図的に彩度を保ちたく、HSL / HEX で管理する方が調整しやすいため)。`@theme inline` を使って Tailwind のカラーユーティリティに接続する。

### タイポグラフィ

```
--font-sans: "Geist", -apple-system, "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif
--font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace
```

- `Geist` / `Geist Mono` は `@fontsource/geist-sans` / `@fontsource/geist-mono` で導入 (Vite との相性がよく latin subset を選択読み込みできる)。CSS で `@import "@fontsource/geist-sans/400.css"` / `600.css` と `@import "@fontsource/geist-mono/400.css"` / `500.css` を行う。
- 日本語は埋め込みせず system stack にフォールバック。
- タイプスケール:

| トークン | size / line-height | weight | letter-spacing | 用途 |
|-|-|-|-|-|
| `text-display` | 40/44 (2xl) → 56/60 (lg) | 600 | -0.035em | ランディング hero |
| `text-h1` | 28/32 | 600 | -0.03em | 画面タイトル |
| `text-h2` | 20/26 | 500 | -0.025em | セクション見出し |
| `text-h3` | 16/22 | 500 | -0.02em | パネル見出し |
| `text-body` | 13/20 | 400 | -0.005em | 本文 |
| `text-small` | 11/16 | 400 | 0 | メタ |
| `text-label` | 10/14 (mono) | 500 | 0.14em uppercase | ラベル / 見出し上のキャプション |

### その他

```
--radius-sm: 4px
--radius:    6px
--radius-lg: 10px
--radius-xl: 14px

--shadow-sm:     0 1px 2px rgba(0,0,0,0.20)
--shadow-md:     0 4px 12px rgba(0,0,0,0.24)
--shadow-lg:     0 8px 24px rgba(0,0,0,0.32)
--shadow-focus:  0 0 0 2px rgba(6,182,212,0.55)

--space-grid-gap: 16px  /* 主要グリッド間隔 */
```

## 画面仕様

### ヘッダー (`src/components/Header.tsx`)

3 セクション構成:

- **左**: ロゴ (cyan の 18px 角丸 `+` アイコン) + "pdfpw" ワードマーク (Geist 600, 13px)
- **中央**: 空 (将来のナビ用に確保、現状は空)
- **右**: `Docs` / `GitHub` リンク (text-small muted) + テーマトグル (Sun/Moon アイコン、ghost button)

テーマトグル動作:

- 初期値: `prefers-color-scheme` (既存挙動を尊重)
- クリックで dark ↔ light 切替、`localStorage.theme` に保存
- 保存値があれば起動時にそれを優先 (OS 設定を上書き)

### ランディング画面 (`src/routes/(main)/index.tsx` + `-landing/`)

3 セクションの縦積み構成:

**1. Hero Section** (Editorial split)

- 左 1.2fr: 小見出し (Geist Mono label `PRESENTER CONSOLE / 001`) + 大見出し 2 行 (暫定コピー: `Precise by / default.`。最終コピーは実装時に再検討) + 説明 2〜3 行 + CTA 2 つ (primary `Open PDF` / secondary `GitHub`)
- 右 1fr: 大きめの Dropzone カード (`border: 1px dashed var(--accent)`, bg `var(--accent-soft)`) 内に `+` アイコン / "Drop a PDF here" / "⌘+O to browse" (Geist Mono)
- Dropzone のドラッグ&ドロップ処理は現状を継承。補助 CTA は FSA 有無で切替:
  - FSA 対応ブラウザ: 「ハイレベル機能で開く」(FSA 使用、既存挙動) と 「標準モードで開く」(file picker) の 2 段構え、既存 UI を踏襲
  - FSA 非対応ブラウザ: 「Browse」(file picker) 1 ボタンのみ

**2. Library Section**

- ラベル行: `LIBRARY` (Geist Mono, uppercase) + メタ (`N files · recent first`) + 右端に設定トグル (「履歴を保存」Switch)
- グリッド: `grid-cols-4 gap-3` (lg)、`grid-cols-3` (md)、`grid-cols-2` (sm)、`grid-cols-1` (xs)
- カード: raised surface、角丸 8px、padding 10px、サムネ (4:3, 背景グラデ)、ファイル名 (text-body fg)、メタ行 (Geist Mono small muted)、FSA は右下にアクセント色の dot、ホバーで削除ボタン表示 (既存挙動継承)
- 空状態: "No recent files yet. Drop a PDF above to start." (muted, center)

**3. How it works Section**

- ラベル行: `HOW IT WORKS`
- グリッド: 3 カラム (md+)、1 カラム (sm)
- 各カードは「番号 (Mono) + 見出し + 2 行説明」のシンプル構成。番号は cyan で強調。例:
  1. **Open a PDF in browser** — No install, no cloud upload. Your file stays on your device.
  2. **Pop out the presentation** — Two synchronized windows: private presenter console and public fullscreen display.
  3. **Present with confidence** — Notes, timer, laser pointer, pen, blackout — all keyboard-driven.

**フッター** (任意、軽量)

- GitHub / License / Version の 3 リンクのみ。text-small subtle。

### プレゼンター画面 (`src/routes/(main)/-presenter/presenter.tsx`)

3 エリア grid 構造 (`grid-template-columns: minmax(0,1fr) clamp(280px,28vw,420px)`, `grid-template-rows: 3fr 1fr`) は **維持**。視覚処理を Card-based に刷新:

- **SlideStage** (左上大): 外枠は raised surface、角丸 10px、内側に `PdfPage` + `PointerOverlay`。現在ページ番号を左下に Mono ラベル `SLIDE 7 / 24` で控えめに配置。
- **NextSlide** (右上): raised surface カード、角丸 8px、ラベル `NEXT · 8 / 24` + 16:9 サムネイル。
- **ModeForm** (右中): raised surface、角丸 8px、padding 8px、ボタン 3〜4 個 (freeze / blackout / overview / pointer トグル) を等幅横並び。active 時は `bg: accent-soft`, `border: accent @ 0.4`。
- **Note** (右下): raised surface、角丸 8px、内側 `prose` (markdown)。フォントサイズ変更 UI (+/- ボタン) は右下に小さく。
- **Footer** (下段、全幅): raised surface、角丸 8px、左: 前スライドサムネ (小)、中央: Prev/Next 大ボタン + ページ番号 + Timer、右: 次スライドサムネ (小)。Timer は既存の色分け (pretalk/too-fast/too-slow/overtime) をトークン経由で参照。

Focus / active の視覚フィードバックは全て cyan アクセントで統一。active ツールボタンは角の左に 2px cyan バー、またはアイコン色が cyan に変わる。

### プレゼンテーション画面 (`src/routes/presentation/`)

レイアウト自体は維持 (`bg-blackout` + SlideStage + PointerOverlay + Menu + OverviewDialog):

- **Menu**: 下部中央の floating bar に変更。背景 `overlay` surface + `shadow-lg`、角丸 10px、padding `8px 12px`、ページ番号 (Geist Mono) + フルスクリーンアイコン。2.5 秒の自動隠蔽は継承。
- **OverviewDialog**: Radix Dialog を使い、overlay surface、角丸 10px、padding 20px、グリッドにサムネイル一覧。選択中ページは cyan ボーダー。

### 共通コンポーネント (`src/components/ui/`)

CVA variant を再定義:

**Button**
- `default` (primary): `bg-accent text-accent-fg` (fg はダーク時 `#052B33`、ライト時 `#FFFFFF`)
- `secondary`: `bg-transparent border-border-strong text-fg`
- `ghost`: `bg-transparent text-muted hover:bg-surface`
- `accent-ghost`: `bg-transparent text-accent border-accent @ 0.32`
- `destructive`: `bg-danger text-white`
- sizes: `sm (h-8, text-small)`, `default (h-9)`, `lg (h-10)`, `icon (9x9)`

**Card**: `bg-raised border-border rounded-lg`。`elevated` variant は shadow-md を付与。

**Dialog**: overlay は backdrop blur (light:rgba(250,250,250,0.6), dark:rgba(7,7,9,0.72))。コンテンツは `bg-overlay border-border shadow-lg rounded-xl`。

**Switch**: trackは off 時 `bg-surface border`, on 時 `bg-accent`。thumb は fg ベース。

**Skeleton**: `bg-raised animate-pulse`。

**Focus ring**: 全フォーカス可能要素に `focus-visible:shadow-focus` で 2px cyan 輪郭。

## 実装方針

### ファイル変更範囲

| ファイル | 変更内容 |
|-|-|
| `src/styles.css` | トークン書き換え、Geist フォント import、`@theme inline` 再定義 |
| `package.json` | `geist` (または `@fontsource/geist-sans` / `@fontsource/geist-mono`) 追加 |
| `src/components/ui/button.tsx` | variants 再定義 |
| `src/components/ui/card.tsx` | variants 再定義 |
| `src/components/ui/dialog.tsx` | overlay / content スタイル調整 |
| `src/components/ui/switch.tsx` | track / thumb 色調整 |
| `src/components/ui/skeleton.tsx` | 色調整 |
| `src/components/Header.tsx` | 3 セクションヘッダー + テーマトグル |
| `src/components/ThemeToggle.tsx` *(新規)* | theme 切替ロジック + UI |
| `src/routes/(main)/index.tsx` + `-landing/*` | Hero / Library / HowItWorks の再構成 |
| `src/routes/(main)/-landing/HeroSection.tsx` | Editorial split + dropzone 統合 (既存の Hero/Dropzone を統合) |
| `src/routes/(main)/-landing/LibrarySection.tsx` | RecentSection を Library として再設計 |
| `src/routes/(main)/-landing/HowItWorksSection.tsx` *(新規)* | 3 ステップ説明 |
| `src/routes/(main)/-presenter/presenter.tsx` | パネル Card 化、Timer / Footer 刷新 |
| `src/routes/(main)/-presenter/-components/ModeForm.tsx` | ボタン active 状態の視覚更新 |
| `src/routes/(main)/-presenter/-components/Note.tsx` | card / prose 見直し |
| `src/routes/presentation/-Menu.tsx` | floating bar スタイル変更 |
| `src/routes/presentation/-OverviewDialog.tsx` | サムネグリッド + 選択 cyan ボーダー |

新規ファイル:
- `src/components/ThemeToggle.tsx`
- `src/hooks/useTheme.ts` (localStorage + media query 連携)
- `src/routes/(main)/-landing/HowItWorksSection.tsx`

### アクセシビリティ

- すべての interactive 要素に `focus-visible:shadow-focus` (2px cyan ring)
- コントラスト比: `fg / bg` は WCAG AA 以上 (ダーク: 15.7:1、ライト: 15.0:1)、`accent / bg` はダーク 5.8:1 (AA 通過)、ライトの accent は `#0891B2` を採用して 4.6:1 を確保
- テーマトグルは `aria-label="Toggle theme"` / `aria-pressed`
- ランディング Hero の CTA 2 つは tabindex 順序で Primary → Secondary

### パフォーマンス

- Geist は woff2 で 2 weight (400, 600) のみ subset 読み込み (欧文のみ)。日本語は system stack。
- フォント読み込みは `font-display: swap`。
- How-it-works セクションは純粋な静的コンテンツ (アイコン + テキストのみ)、画像/動画は追加しない。

### テスト

- 本変更は視覚・スタイル中心で、ロジック変更はテーマトグルのみ。ユニットテスト追加は `useTheme` のみに限定 (localStorage / media query の初期値解決)。
- 視覚リグレッションは手動確認 (landing / presenter / presentation の 3 画面をダーク/ライト両方で確認)。

## マイグレーション

- 既存の OKLch トークンは全削除、新トークンに置換。
- 既存の Tailwind クラス使用箇所は、`bg-background` → `bg-bg` のようにユーティリティ名が変わる場合は置換。ただし可能な限りユーティリティ名は温存し、値のみ差し替える (例: `bg-background` / `text-foreground` はそのまま使え、背景値だけが cyan 基調の新色になる)。
- 旧 `--timer-*` 変数 (`--timer-pretalk`, `--timer-too-fast`, `--timer-too-slow`, `--timer-overtime`) は `--timer-pretalk: var(--success)` のように新トークンへブリッジ定義を置き、既存 Timer コンポーネントは変更しない (値だけ差し替わる)。
- **スコープ分割**: 本 spec は単一 spec として管理するが、実装計画側では (1) トークン+共通コンポーネント、(2) ヘッダー+テーマトグル、(3) ランディング、(4) プレゼンター、(5) プレゼンテーション の 5 フェーズに分けて順次適用する想定。writing-plans 側でフェーズ分解する。

## リスクと考慮

- **Geist フォントの導入**: バンドルサイズが数十 KB 増える。subset (latin のみ) + 2 weight に抑える。
- **日本語ノートの見え方**: Geist は日本語を含まないので system fallback に落ちる。Hiragino Sans / Noto Sans JP がある環境であれば自然。不揃いが気になる場合は後段で対応。
- **FSA 非対応ブラウザの表示**: FSA ボタンは表示しない or テキストを `Open with File Picker` に切替 (既存挙動を踏襲)。
- **テーマクラスの扱い**: 既存コード (`src/styles.css` 等) が `.dark` クラスを前提にしているため、本リデザインでも `.dark` を継続利用する。`useTheme` は `document.documentElement.classList` の `dark` を操作する。将来「高コントラスト」等の追加が必要になった時点で属性方式 (`data-theme`) への移行を検討。

## 成功基準

1. ランディングを初見で開いた人が、3 秒以内に「何のツールか」理解できる (Hero コピー + How it works で判断可能)。
2. プレゼンター画面は、3 エリア構成を保ったまま、cyan アクセントが active/focus/primary action を一貫して示す。
3. テーマトグルはヘッダーから 1 クリックで切替でき、リロード後も保持される。
4. Biome lint / `pnpm tsc -b` / `pnpm test` がすべて通過する。
