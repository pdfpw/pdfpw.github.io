# E2E テスト導入設計 (Playwright Test)

## 概要

実ブラウザでアプリ全体を起動し、ボタンクリック・キーボード操作・マルチウィンドウ間の同期まで含めた挙動を検証する E2E テストを Playwright Test で導入する。あわせて `src/lib/thumbnail.test.ts` の `pdfjs-dist` モックを撤去し、実 PDF fixture を使った検証に置き換える。

既存の Vitest browser mode (Playwright provider, Chromium + Firefox) はコンポーネント / ロジックの単体テストとしてそのまま残す。E2E は別レイヤとして共存する。

## 採用方針

| 項目 | 採用 | 理由 |
|---|---|---|
| 追加するテストランナー | `@playwright/test` | アプリ全体起動・別ウィンドウ捕捉が可能 |
| サーバ | `pnpm dev` (Vite dev) | 起動が速い、E2E iteration が早い。本番ビルドの妥当性は別途 `build` ジョブで担保 |
| ブラウザ | Chromium 単一 | DOM 差は Vitest browser mode (Chromium + Firefox) で担保。E2E は通しの検証が目的 |
| ディレクトリ | `e2e/` をリポジトリ直下に新設 | Vitest と拡張子・配置で明確に分離 |
| CI | `.github/workflows/pr-check.yaml` に `e2e` ジョブ並列追加 | 既存 PR フローに統合、結果を即時得る |

## カバーするシナリオ

| # | スペックファイル | 検証内容 |
|---|---|---|
| 1 | `home-upload.spec.ts` | ホームの `<input type=file>` に PDF + pdfpc を `setInputFiles` し presenter に遷移、PDF が描画される |
| 3 | `recent-files.spec.ts` | アップロード後にホームへ戻ると Library に表示、クリックで再オープン。「履歴を保存」トグルで履歴が消えるか |
| 4 | `slide-navigation.spec.ts` | Next/Prev ボタン、矢印キー、Home/End、`g <数字> Enter`、Backspace の history |
| 5 | `presenter-modes.spec.ts` | Frozen / Blackout / Overview の 3 ボタンの toggle、`aria-pressed` の遷移 |
| 6 | `timer.spec.ts` | Timer の Start / Reset 操作と表示 |
| 7 | `presenter-presentation-sync.spec.ts` | `window.open` で開いた presentation を捕捉し、presenter 側のスライド変更・Blackout が presentation に反映 (Broadcast Channel) |
| 8 | `pdfpc-note.spec.ts` | `pdfpw-demo.pdfpc` に書かれた note が presenter の Note カードに表示 |
| 9 | `locale-switch.spec.ts` | LocaleSwitcher で en/ja 切替、URL prefix と localStorage 更新 |

スコープ外 (今回見送り):

- URL クエリ `?pdf=<url>` 経由の自動読み込み (別 fixture サーバが必要)
- Typst 入力フロー (wasm ロードが重い)
- Drag & drop (DataTransfer エミュレーションが別案件)
- Visual regression / screenshot 比較

## ファイル構成

```
playwright.config.ts                            # 新設
e2e/
├── fixtures/
│   └── pdfs.ts                                 # demo/pdfpw-demo.pdf 等の絶対パス helper
├── helpers/
│   ├── open-pdf.ts                             # / にアクセスし setInputFiles で PDF を開く
│   ├── presentation-window.ts                  # context.waitForEvent('page') で別 window 捕捉
│   └── reset-state.ts                          # IndexedDB / localStorage を毎テスト前にクリア
└── tests/
    ├── home-upload.spec.ts
    ├── recent-files.spec.ts
    ├── slide-navigation.spec.ts
    ├── presenter-modes.spec.ts
    ├── timer.spec.ts
    ├── presenter-presentation-sync.spec.ts
    ├── pdfpc-note.spec.ts
    └── locale-switch.spec.ts
```

## Fixture

- 既存 `demo/pdfpw-demo.pdf` (254KB, 74 ページ) と `demo/pdfpw-demo.pdfpc` をそのまま使用 (コピーしない)
- `setInputFiles` には絶対パスを渡す。helper でリポジトリルートからの相対解決 (`path.resolve(__dirname, '../../demo/...')`) をラップする
- 74 ページあるので Home/End/`g 50 Enter` のような飛び先のあるナビゲーションも検証可能

## `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:6123",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:6123",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

## State isolation (`beforeEach`)

各テストは独立して動くべきなので、`beforeEach` で IndexedDB と localStorage をクリアする。

```ts
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    indexedDB.deleteDatabase("pdfpw");
    localStorage.clear();
  });
  await page.reload();
});
```

`indexedDB.deleteDatabase` 名は `src/lib/recent-store.ts` の DB 名に合わせる (実装確認のうえ helper に固定値で持たせる)。

## マルチウィンドウ (シナリオ 7)

`src/routes/$locale/(main)/index.tsx` の `proceedWithPdf` がファイル選択直後に `window.open(...)` で presentation を開く。Playwright では:

```ts
const [presentationPage] = await Promise.all([
  context.waitForEvent("page"),
  openPdf(page),  // setInputFiles の中で window.open がトリガされる
]);
await presentationPage.waitForLoadState("domcontentloaded");
```

注意点: `presentationWindow` モジュール変数 (`index.tsx`) が一度開いた window を再利用する。テスト間で残ると別テストの presentation が古い window に流れ込む可能性があるため、各テストで `presentationPage.close()` をクリーンアップに入れる。dev サーバ上では Vite HMR がモジュール変数を保持し続けるため、`page.reload()` での state クリアが効く。

## 同期検証ポイント (シナリオ 7)

- presenter で Next ボタン → presenter のページ表示 (`{current+1} / {総数}` 形式、`NextPrevFooter.tsx`) が次に進む → presentation 側も同じスライドに同期 (実装の表示要素に対して assert)。総数は pdfpc の overlay グループ化に依存するため、`74` のような具体値は実 fixture をロード後に取得する
- Blackout ボタン押下 → presentation 側の表示が暗転 (実装の class / data attribute を assert)
- presentation 側の現スライド検証は Canvas ピクセルではなく、ページ番号テキストや `data-page` 等の DOM 属性で行う

## `package.json` 追加

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "1.59.1"
  }
}
```

既存 `playwright` (1.59.1) と版を揃える。

## `vite.config.ts` の Vitest 設定

E2E ディレクトリを Vitest が拾わないよう exclude を明示する:

```diff
 test: {
   globals: true,
   setupFiles: ["./src/test-setup.ts"],
+  exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
   browser: { ... },
 },
```

## `thumbnail.test.ts` のモック撤去

### 変更前 (要約)

```ts
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "mock-worker.js" }));
vi.mock("pdfjs-dist", () => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: "" } }));
// 各テストで mockGetDocument.mockReturnValue(...) を組み立て
```

### 変更後

- 両方の `vi.mock` を撤去
- fixture PDF は `?url` インポートで取得 → `fetch` → `File`:

```ts
import pdfUrl from "../../demo/pdfpw-demo.pdf?url";

async function loadDemoPdf(): Promise<File> {
  const res = await fetch(pdfUrl);
  const blob = await res.blob();
  return new File([blob], "pdfpw-demo.pdf", { type: "application/pdf" });
}
```

### テストケースの再定義

| ケース | 旧 | 新 |
|---|---|---|
| 成功 | mock の `getPage(1)` 呼び出しを assert | 結果が `data:image/jpeg;base64,` で始まり、長さが空 Canvas より十分大きい (例: > 1000) |
| ロードエラー | mock の `promise: Promise.reject(...)` | 不正バイト列 (`new File([new Uint8Array([0,0,0])], 'broken.pdf')`) を渡し `null` が返る |
| Canvas context 失敗 | `HTMLCanvasElement.prototype.getContext` を spy で `null` 返却 | 同じ (Canvas spy は実 PDF と独立) |

実装詳細 (`getPage(1)` 呼び出し回数等) のアサーションは撤廃し、外部から観察可能な挙動 (戻り値) で検証する。

### 注意点

- `?url` インポートは Vite が dev/test サーバ越しに静的アセットとして配信する。Vitest browser mode は内部で Vite を使うため追加設定不要
- worker (`pdf.worker.min.mjs`) も同様に Vite 経由で配信される
- 不正バイト列ケースで `getDocument(...).promise` が reject する。`thumbnail.ts` は `try/catch` で `null` 化する実装になっているか実装確認の上テスト

## CI 統合 (`.github/workflows/pr-check.yaml`)

既存 `test` / `build` と並列で `e2e` ジョブを追加:

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 10
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm exec playwright install --with-deps chromium
    - run: pnpm e2e
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

ブラウザは Chromium のみインストール (Firefox は不要)。失敗時は `playwright-report/` を artifact に上げる。

## `.gitignore` 追加

```
test-results/
playwright-report/
playwright/.cache/
```

## 既存テストへの影響

- Vitest browser mode の既存テストは温存
- 拡張子規約: `*.test.ts(x)` = Vitest、`*.spec.ts` = Playwright
- `thumbnail.test.ts` のみ内部のモック構造が変わる (上記)

## ロールアウト順序 (実装計画で詰める観点)

1. `@playwright/test` 追加 / `playwright.config.ts` / `e2e/` ひな形 / `.gitignore` / `vite.config.ts` exclude
2. helper (`open-pdf`, `reset-state`, `presentation-window`)
3. シナリオ 1 (`home-upload`) を最初に通す (基盤動作確認)
4. シナリオ 4, 5, 6, 8, 9 (単一ウィンドウで完結する系) を追加
5. シナリオ 3 (recent files の状態管理)
6. シナリオ 7 (マルチウィンドウ — 最も複雑)
7. `thumbnail.test.ts` のモック撤去
8. CI ジョブ追加

各ステップで `pnpm e2e` がローカル green、Chromium 1 ブラウザで CI 通過を確認しながら進める。
