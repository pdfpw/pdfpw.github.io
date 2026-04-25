# Copy Redesign

## Scope

- Product name casing (site-wide)
- Meta title
- Hero section
- How It Works section

## Product Name

Change from `PDFPW` to `pdfpw` (all lowercase) everywhere: header logo, page titles, meta tags, OGP, and any other occurrences.

Rationale: echoes the pdfpc naming convention; more authentic to the developer/presenter tool space.

## Meta Title

Titles are defined in two places:

### `src/vite-plugins/locale-html-plugin.ts` (locale-specific static HTML)

| Locale | Before | After |
|--------|--------|-------|
| JA | `PDFPW — 精密設計のプレゼンタコンソール` | `pdfpw — ブラウザで動く pdfpc` |
| EN | `PDFPW — Precise PDF presenter` | `pdfpw — pdfpc in your browser` |

### `index.html` (root fallback + OGP)

| Field | Before | After |
|-------|--------|-------|
| `<title>` | `PDFPW – PDF Presenter Web` | `pdfpw — pdfpc in your browser` |
| `og:title` | `PDFPW – PDF Presenter Web` | `pdfpw — pdfpc in your browser` |

### `messages/ja.json` and `messages/en.json`

The `meta_title` key exists in the message files but is not used at runtime. Update for consistency:

| Locale | Before | After |
|--------|--------|-------|
| JA | `PDFPW — 精密設計のプレゼンタコンソール` | `pdfpw — ブラウザで動く pdfpc` |
| EN | `PDFPW — Precise PDF presenter` | `pdfpw — pdfpc in your browser` |

## Hero Section

### Eyebrow (`hero_eyebrow`)

Remove. The `hero_eyebrow` message key is deleted and the element is removed from `HeroSection.tsx`.

### Headline (`hero_headline_line1`, `hero_headline_line2`)

Shared across both locales (English copy only):

| Key | Value |
|-----|-------|
| `hero_headline_line1` | `pdfpc,` |
| `hero_headline_line2` | `in your browser.` |

### Lead (`hero_lead`)

| Locale | Value |
|--------|-------|
| JA | `ブラウザで動くプレゼンタコンソール。インストール・クラウドアップロード不要。` |
| EN | `A browser-based presenter console. No install, no upload.` |

## How It Works Section

### Step 1

| Key | JA | EN |
|-----|----|----|
| `howitworks_step1_title` | `PDF を開く` | `Open a PDF` |
| `howitworks_step1_body` | `インストール不要。ファイルはブラウザ外に送信されません。.pdfpc 設定ファイルにも対応。` | `No install, no upload. Files stay on your device. pdfpc config files supported.` |

### Step 2

| Key | JA | EN |
|-----|----|----|
| `howitworks_step2_title` | `プレゼンテーション画面を開く` | `Open the presentation window` |
| `howitworks_step2_body` | `プレゼンター画面（ノート・タイマー付き）と客席用フルスクリーンの 2 ウィンドウが同期します。` | `A presenter console with notes and timer, synced to a fullscreen audience display.` |

### Step 3

| Key | JA | EN |
|-----|----|----|
| `howitworks_step3_title` | `発表する` | `Present` |
| `howitworks_step3_body` | `ノート・タイマー・レーザーポインタ・ペン・ブラックアウトをキーボードで操作できます。` | `Notes, timer, laser pointer, pen, and blackout — all keyboard-driven.` |

## Out of Scope

- All other message keys remain unchanged
- OGP description (`meta_description`) is not changed in this iteration
