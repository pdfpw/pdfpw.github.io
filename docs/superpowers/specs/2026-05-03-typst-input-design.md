# 設計: Typst ファイル入力 (ブラウザ内コンパイル、エディタなし)

- 起票: 2026-05-03
- 関連 issue: #12
- ステータス: 設計確定

## 目的

`.typ` ファイルを直接受け付け、ブラウザ内で PDF にコンパイルしてから既存の PDF プレゼンパイプラインに合流させる。Typst をローカルにインストールしなくても発表できるようにし、他のブラウザ PDF プレゼンターと差別化する。

## スコープ

**やる:**

- `.typ` ファイルをファイル選択 / ドラッグ&ドロップ / FSA picker で受け付ける
- 公式パッケージレジストリ (`https://packages.typst.org`) からの自動 fetch (touying / polylux 等が動作)
- D&D 経路はフォルダ込みのフルツリーを再帰展開して受領
- Web Worker 上の typst.ts (WASM) でコンパイル → PDF
- 既存 `handleFiles` フローへ合流 (PdfPage / pdfpc / overview / 検索すべて自動的に効く)
- 動的 import で初回バンドルから typst.ts を分離
- Recent files に Typst ソースを保存、再オープン時に毎回再コンパイル

**やらない:**

- ブラウザ内エディタ / ライブプレビュー
- ピッカー (input / FSA) からのフォルダ選択 (D&D 経路でのみフルツリー対応)
- 完全オフライン動作 (パッケージ取得時はネットワーク必須)
- Typst の直接レンダリング (canvas / SVG): すべて PDF 経由
- コンパイル済み PDF のキャッシュ (整合性問題を避けるため毎回再コンパイル)

## 確定事項 (ブレストでの決定)

- **パッケージ**: 公式レジストリから自動 fetch
- **マルチファイル**: D&D はフォルダ込み再帰展開、ピッカーはフラット複数のみ
- **エラー UX**: HeroSection の status エリアに `file:line:col — message` 形式の診断リスト
- **履歴**: Typst ソースを保存、再オープン時に再コンパイル
- **コンパイル**: Web Worker (UI ブロック回避)
- **進捗**: ステージ表示 (`WASM 読込 → パッケージ取得 → コンパイル`)
- **mainFile 判定**: 単一 `.typ` ならそれ / 複数なら `main.typ` / なければ最浅・アルファベット先頭
- **PDF 出力**: コンパイル結果 `Uint8Array` を `File` 化して既存 PDF パイプラインへ
- **`.pdfpc` ペアリング**: ステム一致で従来通り

## アーキテクチャ

```
[D&D / file input / FSA picker]
            │ (File[] + 任意の dir entries)
            ▼
   index.tsx#handleFiles
            │
  ┌─────────┴──────────┐
  │ .typ を含む?         │── No ──▶ 既存 PDF フロー
  └─────────┬──────────┘
            │ Yes
            ▼
  compileTypst(sources, mainPath)        # src/lib/typst.ts
            │   (動的 import)
            ▼
  Web Worker (src/workers/typst-worker.ts)
    1. WASM 読込 (typst.ts)
    2. パッケージ取得 (packages.typst.org)
    3. コンパイル → PDF Uint8Array  or  diagnostics[]
            │
  ┌─────────┴──────────┐
  │ 成功?               │
  └────┬────────┬──────┘
       │成功    │失敗
       ▼        ▼
  PDF File   diagnostic[] → HeroSection に診断リスト表示
       │
       ▼
  既存 handleFiles 続行 (recent 保存 / ナビゲート)
```

## モジュール構成

### 新規

| ファイル | 役割 |
|---|---|
| `src/lib/typst.ts` | 公開 API `compileTypst({ sources, mainPath, onProgress })`、型定義、Worker クライアント。`@myriaddreamin/typst.ts` を Worker 内のみで参照。 |
| `src/lib/typst-source-detect.ts` | `containsTypst(files)` / `pickMainTypst(sources)` / D&D `webkitGetAsEntry` 再帰展開ユーティリティ |
| `src/workers/typst-worker.ts` | typst.ts WASM ロード、パッケージ取得コールバック設定、コンパイル実行、postMessage で進捗・結果送信 |
| `src/components/TypstDiagnosticList.tsx` | 診断行のリスト表示 (severity アイコン / `file:line:col` / message / 折りたたみ) |
| `src/lib/typst.test.ts` | 最小 .typ → PDF、構文エラー → 診断、main 判定、エントリ再帰展開のユニットテスト |
| `src/lib/typst-source-detect.test.ts` | mainPath 選択ルール、D&D 再帰展開のテスト |

### 改修

| ファイル | 変更内容 |
|---|---|
| `src/routes/$locale/(main)/index.tsx` | `handleFiles` 入口で `.typ` 分岐 → `compileTypst` → PDF File 化して再入。失敗時 diagnostics を state にセット。 |
| `src/routes/$locale/(main)/-index/HeroSection.tsx` | `accept` に `.typ` を追加。`onDrop` で `dataTransfer.items` を `webkitGetAsEntry` 経由で再帰列挙。`status` を `statusNode: ReactNode` に拡張し、診断リストを描画可能に。 |
| `src/lib/recent-store.ts` | `RecentFile` に `kind: "pdf" \| "typst"` と `assetHandles?` / `assetFiles?` を追加 (FSA / Standard 双方)。`mainPath` を保存。 |
| `package.json` | `@myriaddreamin/typst.ts` (および compiler 系の依存) を追加。 |
| `src/paraglide/messages/*.json` | Typst 用 i18n キーを追加 (下記)。 |

## 公開 API / 型

```ts
// src/lib/typst.ts
export interface TypstSource {
  /** プロジェクトルート相対パス。例: "main.typ", "images/logo.png" */
  path: string;
  data: Uint8Array;
}

export interface TypstDiagnostic {
  severity: "error" | "warning";
  path: string;
  line: number;   // 1-origin
  column: number; // 1-origin
  message: string;
}

export type TypstProgress =
  | { stage: "loading-wasm" }
  | { stage: "fetching-packages"; current?: string }
  | { stage: "compiling" };

export interface CompileRequest {
  sources: TypstSource[];
  mainPath: string;
}

export type CompileResult =
  | { ok: true; pdf: Uint8Array }
  | { ok: false; diagnostics: TypstDiagnostic[] };

export interface CompileOptions {
  signal?: AbortSignal;
  onProgress?: (p: TypstProgress) => void;
}

export function compileTypst(
  req: CompileRequest,
  opts?: CompileOptions,
): Promise<CompileResult>;
```

## データフロー詳細

1. **入力収集** — D&D は `dataTransfer.items[i].webkitGetAsEntry()` を再帰列挙して `TypstSource[]` (相対パス保持)。input / picker はフラットに `TypstSource[]`。
2. **mainPath 判定** — `pickMainTypst(sources)`:
   - `.typ` 1 件 → それ
   - 複数 → ルートに `main.typ` があればそれ
   - なければ階層が最浅、同階層ならアルファベット先頭の `.typ`
   - `.typ` ゼロ件 → 通常 PDF 経路 (Typst フローに入らない)
   - 主ファイル決定不能ケースは現実には起こらないが、念のため `m.typst_error_no_main()` で fallback
3. **Worker 起動** — `new Worker(new URL("../workers/typst-worker.ts", import.meta.url), { type: "module" })`。Worker 内で `await import("@myriaddreamin/typst.ts")` し、WASM を初期化。`packageRegistry` を `https://packages.typst.org/preview/<ns>/<name>/<version>/` への fetch に設定。
4. **コンパイル** — `compile({ format: "pdf", mainFilePath: req.mainPath, vfs: req.sources })`。stage 変化 (`loading-wasm` → `fetching-packages` → `compiling`) を postMessage。
5. **結果**:
   - 成功: `{ ok: true, pdf: Uint8Array }` を main thread に返す → `new File([pdf], `${stem}.pdf`, { type: "application/pdf" })` を作成 → `handleFiles` の本体 (Typst 分岐より下) を抽出した `proceedWithPdf(pdfFile, pdfpcFile?)` ヘルパーを呼ぶ。Typst 分岐側はこのヘルパーを共有することで再帰や分岐スキップフラグを避ける。
   - 失敗: `{ ok: false, diagnostics }` → `setStatusNode(<TypstDiagnosticList items={diagnostics} />)`。Worker は terminate。
6. **Worker 寿命** — 1 リクエスト 1 Worker (使い捨て)。再コンパイル時は新規生成。WASM とパッケージは HTTP cache に乗るため再起動コストは小さい。
7. **キャンセル** — `AbortSignal` で Worker terminate。

## Recent files の挙動

`RecentFile` を以下のように拡張する:

```ts
type RecentFile =
  | RecentPdfFile          // 既存
  | RecentTypstFile;       // 追加

interface RecentTypstFile {
  kind: "typst";
  id: string;
  name: string;            // main .typ のファイル名
  mainPath: string;        // プロジェクト相対パスでの main 指定
  lastOpened: number;
  thumbnail?: Uint8Array;  // 初回コンパイル成功後に生成
  // FSA mode
  handle?: FileSystemFileHandle;            // main .typ
  assetHandles?: FileSystemFileHandle[];    // 同階層の他ファイル
  // Standard mode
  file?: File;
  assetFiles?: File[];
  // 任意の pdfpc ペア (従来通り)
  configHandle?: FileSystemFileHandle;
  configFile?: File;
  configName?: string;
}
```

再オープン時のフロー:

- handle 群 (or file 群) → `TypstSource[]` 再構築 → `compileTypst` → PDF File → 既存処理
- FSA mode: 外部エディタが `.typ` を更新していれば自動で最新版が読まれる (ねらい通り)
- Standard mode: snapshot 取得時点の内容で再コンパイル

サブディレクトリ込みプロジェクト (D&D 経由のみ) の file 配列は相対パスを保持する必要がある。Standard mode は `File.webkitRelativePath` を保持。FSA mode は本仕様ではサブディレクトリ非対応 (FSA picker がフォルダ選択をサポートしないため、再オープン時の handle 群もフラット階層のみ)。

**マイグレーション**: 既存 `RecentFile` には `kind` がない。読み込み時に `kind` 未設定なら `"pdf"` として扱う (defaulting)。書き込み時は常に `kind` を含める。これによりスキーマバージョン更新は不要。

## エラー / エッジケース

| 状況 | 挙動 |
|---|---|
| 公式レジストリ fetch 失敗 | 診断 1 件 `「パッケージ取得失敗: @preview/touying:0.5.5」` を表示 |
| 構文エラー | typst.ts の diagnostics をパースしてリスト表示 |
| WASM 初期化失敗 | `m.typst_error_runtime_init()` を status に表示、Worker terminate |
| `webkitGetAsEntry` 非対応 | フラット D&D にフォールバック (現状動作) |
| .typ サイズが極端に大きい (> 5MB) | 警告ログ、続行は許可 |
| 主ファイル判定不能 | `m.typst_error_no_main()` |
| Worker timeout (60s 超) | 中断、`m.typst_error_timeout()` |

## i18n キー

```
typst_status_loading_wasm
typst_status_fetching_packages          // {package}
typst_status_compiling
typst_error_no_main
typst_error_compile_failed              // {count}
typst_error_package_fetch               // {package}
typst_error_runtime_init
typst_error_timeout
typst_diag_severity_error
typst_diag_severity_warning
typst_diag_summary                      // {errors}, {warnings}
```

## バンドル / 動的 import

- `@myriaddreamin/typst.ts` を `dependencies` に追加
- `src/lib/typst.ts` の `compileTypst` 内でのみ `new Worker(...)` を呼び、Worker 内で `await import("@myriaddreamin/typst.ts")`
- Vite はこれを別チャンクに分割するため、`.typ` を開かない限り WASM もコンパイラ JS も読み込まれない
- WASM ファイルは Vite の `?url` import で URL 化、Worker から fetch

## テスト

- `typst.test.ts` (vitest browser):
  - 最小 .typ (`= Hello`) → コンパイル成功 → PDF 先頭が `%PDF-`
  - 構文エラー → `ok: false`、`diagnostics[0].line` が期待値
  - 進捗イベントが `loading-wasm → compiling` の順で発火
- `typst-source-detect.test.ts`:
  - 単一 `.typ` → 主ファイルはそれ
  - 複数 `.typ` で `main.typ` あり → `main.typ` が選ばれる
  - 複数 `.typ` で `main.typ` なし → 最浅・アルファベット先頭
  - D&D エントリ再帰展開 (モック `FileSystemEntry` で再帰深度 2)
- 既存 `index.test.tsx` に Typst を含むケースの統合テストは追加しない (Worker / WASM の都合で重い)。代わりに `compileTypst` をモックした分岐ロジックのみテスト。

## 実装段階の分割 (writing-plans 用の参考)

1. `typst-source-detect.ts` + テスト (D&D 再帰展開、main 判定)
2. Worker + `compileTypst` API + テスト (最小 .typ で成功/失敗)
3. `TypstDiagnosticList` コンポーネント
4. HeroSection の `accept` / D&D / `statusNode` 改修
5. `index.tsx#handleFiles` の `.typ` 分岐実装
6. `recent-store.ts` の `RecentTypstFile` 追加 + 再オープンフロー
7. i18n キー追加
8. 動作確認 (touying / polylux のサンプル)
