# CI PR チェック + Firefox テスト 導入設計

## 概要

PR 作成時に test と build の CI チェックを並列実行する GitHub Actions ワークフローを追加する。
合わせて Vitest のブラウザテストに Firefox を追加し、Chromium / Firefox の両ブラウザでテストを実行する。

## アプローチ

単一の `test` ジョブで Vitest の複数インスタンス機能を使い、Chromium と Firefox を同時実行する。
`test` と `build` は独立した並列ジョブとして実行する。

## ファイル変更

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `.github/workflows/pr-check.yaml` | 新規作成 | PR トリガーの test / build 並列ジョブ |
| `vite.config.ts` | 修正 | `instances` に `{ browser: "firefox" }` を追加 |

既存の `.github/workflows/ci.yaml`（`push: main` のデプロイ）は変更しない。

## `.github/workflows/pr-check.yaml`

```yaml
name: PR Check

on:
  pull_request:
    branches:
      - main

jobs:
  test:
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
      - run: pnpm exec playwright install --with-deps chromium firefox
      - run: pnpm test

  build:
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
      - run: pnpm build
```

## `vite.config.ts` の変更

```diff
  browser: {
    enabled: true,
    provider: playwright(),
-   instances: [{ browser: "chromium" }],
+   instances: [{ browser: "chromium" }, { browser: "firefox" }],
  },
```

この変更は PR #19（`feat/vitest-browser` ブランチ）に追加コミットとして乗せる。

## 注意点

- `playwright install --with-deps` はブラウザバイナリとシステム依存パッケージを両方インストールする
- Firefox インスタンス追加後、ローカルでテストを実行するには `pnpm exec playwright install firefox` が必要
- `build` ジョブは `tsc -b` も含む（`pnpm build` = `vite build && tsc -b`）
