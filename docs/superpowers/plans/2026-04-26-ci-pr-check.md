# CI PR チェック + Firefox テスト 導入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR 作成時に test（Chromium + Firefox）と build を並列 CI チェックとして実行する。

**Architecture:** `.github/workflows/pr-check.yaml` を新規作成し `pull_request` トリガーで test / build ジョブを並列実行。`vite.config.ts` に Firefox インスタンスを追加して両ブラウザでテストを実行する。変更はすべて `feat/vitest-browser` ブランチ（PR #19）に追加コミットとして乗せる。

**Tech Stack:** GitHub Actions, Playwright (Chromium + Firefox), Vitest 4.1.5

---

### Task 1: vite.config.ts に Firefox インスタンスを追加

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: `instances` 配列に Firefox を追加する**

作業ディレクトリ: `feat/vitest-browser` ブランチ（`git checkout feat/vitest-browser`）

`vite.config.ts` の `browser` セクションを以下に変更する:

変更前:
```ts
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
		},
```

変更後:
```ts
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }, { browser: "firefox" }],
		},
```

- [ ] **Step 2: Firefox バイナリをローカルにインストールする**

```bash
pnpm exec playwright install firefox
```

期待する出力:
```
Downloading Firefox ...
Firefox ... downloaded to ...
```

- [ ] **Step 3: テストを実行して Chromium と Firefox の両方で通ることを確認する**

```bash
pnpm test
```

期待する出力（11ファイル × 2ブラウザ = 22テストファイル分のパス）:
```
 ✓ |chromium| src/lib/pointer-state.test.ts
 ✓ |firefox| src/lib/pointer-state.test.ts
 ...
 Test Files  22 passed (22)
      Tests  138 passed (138)
```

- [ ] **Step 4: コミット**

```bash
git add vite.config.ts
git commit -m "feat: Firefox をブラウザテストに追加"
```

---

### Task 2: GitHub Actions PR チェックワークフローを作成

**Files:**
- Create: `.github/workflows/pr-check.yaml`

- [ ] **Step 1: `.github/workflows/pr-check.yaml` を作成する**

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

- [ ] **Step 2: ファイルが正しく作成されていることを確認する**

```bash
cat .github/workflows/pr-check.yaml
```

`name: PR Check` と `on: pull_request:` が含まれていることを確認する。

- [ ] **Step 3: コミット**

```bash
git add .github/workflows/pr-check.yaml
git commit -m "ci: PR チェックワークフローを追加（test + build 並列）"
```

- [ ] **Step 4: `feat/vitest-browser` ブランチを push する**

```bash
git push origin feat/vitest-browser
```

PR #19 に新しいコミットが反映され、GitHub Actions が起動することを確認する。
