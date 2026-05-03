# E2E Tests (Playwright) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright Test as a separate E2E layer that exercises the real app via the dev server with actual button clicks and keyboard input, and remove the `pdfjs-dist` mock from `thumbnail.test.ts` in favor of a real fixture PDF.

**Architecture:** Playwright Test runs in `e2e/`, separate from Vitest browser-mode unit tests in `src/`. Playwright's `webServer` boots `pnpm dev` (Vite) at `http://localhost:6123`. Tests reuse `demo/pdfpw-demo.pdf` and `demo/pdfpw-demo.pdfpc` as fixtures. Each test isolates state by clearing IndexedDB (`pdfpw` DB) and `localStorage` in `beforeEach`. Multi-window tests capture the presentation window via `BrowserContext.waitForEvent('page')`.

**Tech Stack:** `@playwright/test` 1.59.1 (matching existing `playwright`), Vite dev server, GitHub Actions for CI.

**Reference spec:** `docs/superpowers/specs/2026-05-04-e2e-tests-design.md`

---

## File Structure

| Path | Purpose | New / Modified |
|---|---|---|
| `playwright.config.ts` | Playwright Test config (testDir, webServer, projects) | New |
| `e2e/fixtures/pdfs.ts` | Absolute paths for `demo/*.pdf` / `*.pdfpc` | New |
| `e2e/helpers/reset-state.ts` | Clear IndexedDB / localStorage per test | New |
| `e2e/helpers/open-pdf.ts` | Upload demo fixture via `<input type=file>` and wait for presenter | New |
| `e2e/helpers/presentation-window.ts` | Capture and dispose the `window.open`-spawned presentation page | New |
| `e2e/tests/home-upload.spec.ts` | Scenario 1 | New |
| `e2e/tests/slide-navigation.spec.ts` | Scenario 4 | New |
| `e2e/tests/presenter-modes.spec.ts` | Scenario 5 | New |
| `e2e/tests/timer.spec.ts` | Scenario 6 | New |
| `e2e/tests/pdfpc-note.spec.ts` | Scenario 8 | New |
| `e2e/tests/locale-switch.spec.ts` | Scenario 9 | New |
| `e2e/tests/recent-files.spec.ts` | Scenario 3 | New |
| `e2e/tests/presenter-presentation-sync.spec.ts` | Scenario 7 | New |
| `package.json` | Add `@playwright/test`, `e2e` / `e2e:ui` scripts | Modify |
| `.gitignore` | Ignore Playwright outputs | Modify |
| `vite.config.ts` | Exclude `e2e/` from Vitest discovery | Modify |
| `src/routes/$locale/(main)/-presenter/NextPrevFooter.tsx` | Add `aria-label` to prev/next buttons (E2E selector) | Modify |
| `src/lib/thumbnail.test.ts` | Remove `pdfjs-dist` mock, use real fixture | Modify |
| `messages/en.json`, `messages/ja.json` | Add aria-label messages for prev/next | Modify |
| `.github/workflows/pr-check.yaml` | Add `e2e` job parallel to `test` / `build` | Modify |

---

## Task 1: Install `@playwright/test` and project scaffolding

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add `@playwright/test` to devDependencies and scripts**

Run:

```bash
pnpm add -D @playwright/test@1.59.1
```

Then edit `package.json` `scripts` section to add `e2e` and `e2e:ui` (keep existing scripts intact):

```json
"scripts": {
  "dev": "vite --port 6123",
  "build": "vite build && tsc -b",
  "preview": "vite preview",
  "test": "vitest run",
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "format": "biome format",
  "lint": "biome lint",
  "check": "biome check",
  "generate:icons": "node --experimental-strip-types scripts/generate-icons.mts"
}
```

- [ ] **Step 2: Install Playwright browsers (Chromium only)**

Run:

```bash
pnpm exec playwright install --with-deps chromium
```

Expected: download progress, then "Successfully installed".

- [ ] **Step 3: Update `.gitignore`**

Append:

```
# Playwright
test-results/
playwright-report/
playwright/.cache/
```

- [ ] **Step 4: Verify install**

Run:

```bash
pnpm exec playwright --version
```

Expected: `Version 1.59.1`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore(e2e): add @playwright/test and scripts"
```

---

## Task 2: Create `playwright.config.ts`

**Files:**
- Create: `playwright.config.ts`

- [ ] **Step 1: Write config**

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

- [ ] **Step 2: Verify Playwright loads the config**

Run (no tests yet, just discovery):

```bash
pnpm exec playwright test --list
```

Expected: `Listing tests:` followed by `Total: 0 tests in 0 files` (no error about missing config).

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "chore(e2e): add Playwright config"
```

---

## Task 3: Exclude `e2e/` from Vitest discovery

**Files:**
- Modify: `vite.config.ts:221-229` (the `test:` block)

- [ ] **Step 1: Add `exclude` entry**

Locate the `test:` config block and update it:

```ts
test: {
	globals: true,
	setupFiles: ["./src/test-setup.ts"],
	exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
	browser: {
		enabled: true,
		provider: playwright(),
		instances: [{ browser: "chromium" }, { browser: "firefox" }],
	},
},
```

- [ ] **Step 2: Verify Vitest ignores e2e**

Run:

```bash
pnpm test --reporter=verbose 2>&1 | head -20
```

Expected: existing tests collected; no error about `e2e/` (the dir is empty, but `exclude` should prevent any future regression).

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore(test): exclude e2e/ from Vitest"
```

---

## Task 4: Add fixtures helper

**Files:**
- Create: `e2e/fixtures/pdfs.ts`

- [ ] **Step 1: Write the helper**

```ts
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

export const fixtures = {
	pdf: path.join(repoRoot, "demo", "pdfpw-demo.pdf"),
	pdfpc: path.join(repoRoot, "demo", "pdfpw-demo.pdfpc"),
} as const;
```

- [ ] **Step 2: Sanity check the paths exist**

Run:

```bash
node --input-type=module -e "import('./e2e/fixtures/pdfs.ts').then(m=>console.log(m.fixtures))" 2>&1 | head -5
```

(If TS-loading via Node fails, skip and rely on Playwright to import it later.)

Alternative verification:

```bash
test -f demo/pdfpw-demo.pdf && test -f demo/pdfpw-demo.pdfpc && echo OK
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures/pdfs.ts
git commit -m "test(e2e): add demo PDF fixture helper"
```

---

## Task 5: Add reset-state helper

**Files:**
- Create: `e2e/helpers/reset-state.ts`

- [ ] **Step 1: Write the helper**

```ts
import type { Page } from "@playwright/test";

/**
 * Clear IndexedDB ("pdfpw" DB defined in src/lib/recent-store.ts) and localStorage,
 * then reload. Call once per test before navigating to feature pages.
 */
export async function resetAppState(page: Page): Promise<void> {
	await page.goto("/");
	await page.evaluate(async () => {
		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase("pdfpw");
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
			req.onblocked = () => resolve();
		});
		localStorage.clear();
	});
	await page.reload();
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/reset-state.ts
git commit -m "test(e2e): add resetAppState helper"
```

---

## Task 6: Add open-pdf helper

**Files:**
- Create: `e2e/helpers/open-pdf.ts`

The home page renders a hidden `<input type=file>` (see `src/routes/$locale/(main)/-index/HeroSection.tsx:287-295`, `class="sr-only"`, `accept=".pdf,.pdfpc,.typ,application/pdf,application/json"`, `multiple`). Playwright can call `setInputFiles` on hidden inputs without dispatching a click.

- [ ] **Step 1: Write the helper**

```ts
import { expect, type Page } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";

/**
 * Upload the demo PDF + pdfpc via the hidden file input on the home page.
 * Waits for navigation to /<locale>/presenter and the slide counter to render.
 *
 * Returns the locale prefix that ended up being used (defaults to /en when LANG fallback hits English).
 */
export async function openDemoPdf(
	page: Page,
	options: { withPdfpc?: boolean } = {},
): Promise<{ localePath: string }> {
	const withPdfpc = options.withPdfpc ?? true;
	const files = withPdfpc ? [fixtures.pdf, fixtures.pdfpc] : [fixtures.pdf];

	const fileInput = page.locator('input[type="file"][accept*=".pdf"]');
	await fileInput.setInputFiles(files);

	await page.waitForURL(/\/(en|ja)\/presenter/, { timeout: 15_000 });
	// Wait for the slide counter rendered by NextPrevFooter ("{n} / {total}")
	await expect(page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/")).toBeVisible({
		timeout: 15_000,
	});

	const localePath = new URL(page.url()).pathname.startsWith("/ja")
		? "/ja"
		: "/en";
	return { localePath };
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/open-pdf.ts
git commit -m "test(e2e): add openDemoPdf helper"
```

---

## Task 7: Add presentation-window helper

**Files:**
- Create: `e2e/helpers/presentation-window.ts`

`src/routes/$locale/(main)/index.tsx:256-261` calls `window.open(url, "_blank", ...)` immediately after navigating to presenter. The `BrowserContext` emits `'page'` when the new tab opens.

- [ ] **Step 1: Write the helper**

```ts
import type { BrowserContext, Page } from "@playwright/test";

/**
 * Wait for the presentation window opened by `proceedWithPdf` (window.open).
 * Pair with the action that triggers it (e.g. setInputFiles).
 */
export async function capturePresentationPage(
	context: BrowserContext,
	trigger: () => Promise<void>,
): Promise<Page> {
	const [presentation] = await Promise.all([
		context.waitForEvent("page"),
		trigger(),
	]);
	await presentation.waitForLoadState("domcontentloaded");
	return presentation;
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/presentation-window.ts
git commit -m "test(e2e): add capturePresentationPage helper"
```

---

## Task 8: Scenario 1 — `home-upload.spec.ts`

**Files:**
- Create: `e2e/tests/home-upload.spec.ts`

This is the first end-to-end test and validates the entire setup. The presentation window is opened automatically; close it after to keep test isolation.

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

test.describe("home upload → presenter", () => {
	test.beforeEach(async ({ page }) => {
		await resetAppState(page);
	});

	test("uploads PDF + pdfpc and navigates to presenter", async ({ page, context }) => {
		const fileInput = page.locator('input[type="file"][accept*=".pdf"]');

		const presentationPromise = context.waitForEvent("page");
		await fileInput.setInputFiles([fixtures.pdf, fixtures.pdfpc]);

		await page.waitForURL(/\/(en|ja)\/presenter/, { timeout: 15_000 });

		// Slide counter from NextPrevFooter
		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toBeVisible({ timeout: 15_000 });

		// Stage shows "SLIDE n / total"
		await expect(page.locator("text=/SLIDE\\s+1\\s*\\/\\s*\\d+/i")).toBeVisible();

		// Cleanup the auto-opened presentation window
		const presentation = await presentationPromise;
		await presentation.close();
	});
});
```

- [ ] **Step 2: Run and verify it passes (or surfaces a real bug)**

Run:

```bash
pnpm e2e --reporter=list
```

Expected: `1 passed`. If it fails, fix the helper / locator issue (do NOT add waits to mask flakiness — diagnose).

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/home-upload.spec.ts
git commit -m "test(e2e): scenario 1 - home upload → presenter"
```

---

## Task 9: Add `aria-label` to prev/next buttons in `NextPrevFooter`

The slide-navigation spec needs a stable accessible name for the Prev / Next icon buttons. They currently render only icons (`ChevronLeftCircleIcon`, `ChevronRightCircleIcon`) with no accessible name.

**Files:**
- Modify: `messages/en.json`, `messages/ja.json`
- Modify: `src/routes/$locale/(main)/-presenter/NextPrevFooter.tsx:84-106`

- [ ] **Step 1: Add message keys to `messages/en.json`**

Add:

```json
"presenter_prev_slide_aria": "Previous slide",
"presenter_next_slide_aria": "Next slide",
```

(Place them near other `presenter_*_aria` keys. The existing `kb_slide_next_label` / `kb_slide_prev_label` are for the keyboard-help dialog; we keep these distinct since they describe key labels rather than button purposes.)

- [ ] **Step 2: Add the same keys to `messages/ja.json`**

```json
"presenter_prev_slide_aria": "前のスライド",
"presenter_next_slide_aria": "次のスライド",
```

- [ ] **Step 3: Run paraglide compile (will be triggered by `pnpm dev` automatically; no separate command needed)**

Run:

```bash
pnpm tsc -b 2>&1 | head -20
```

Expected: no errors related to missing message functions yet (they are referenced in next step).

- [ ] **Step 4: Wire `aria-label` to the prev/next buttons in `NextPrevFooter.tsx`**

Add `import * as m from "#src/paraglide/messages.js";` at the top if absent.

Update the two `<Button>` blocks at `NextPrevFooter.tsx:84-106`:

```tsx
<Button
	type="button"
	disabled={prevPageNumber === null}
	variant="ghost"
	size="icon-lg"
	onClick={onPrevSlide}
	aria-label={m.presenter_prev_slide_aria()}
	className="rounded-full"
>
	<ChevronLeftCircleIcon className="size-7" />
</Button>
<div className="text-2xl">
	{current + 1} / {pdfpcConfig.pages.length}
</div>
<Button
	type="button"
	disabled={nextPageNumber === null}
	variant="ghost"
	size="icon-lg"
	className="rounded-full"
	onClick={onNextSlide}
	aria-label={m.presenter_next_slide_aria()}
>
	<ChevronRightCircleIcon className="size-7" />
</Button>
```

- [ ] **Step 5: Verify type-check**

Run:

```bash
pnpm tsc -b
```

Expected: no errors.

- [ ] **Step 6: Verify existing tests still pass**

Run:

```bash
pnpm test
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/ja.json src/routes/'$locale'/'(main)'/-presenter/NextPrevFooter.tsx
git commit -m "a11y(presenter): label prev/next slide buttons"
```

---

## Task 10: Scenario 4 — `slide-navigation.spec.ts`

**Files:**
- Create: `e2e/tests/slide-navigation.spec.ts`

Demo `pdfpw-demo.pdfpc` has 27 user slides (label `0` through `26`). The PDF itself has 74 raw pages.

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

test.describe("slide navigation", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([fixtures.pdf, fixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/);
		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toBeVisible({ timeout: 15_000 });
		const presentation = await presentationPromise;
		presentationCloser = async () => {
			if (!presentation.isClosed()) await presentation.close();
		};
	});

	test.afterEach(async () => {
		await presentationCloser?.();
		presentationCloser = null;
	});

	const counter = (page: import("@playwright/test").Page) =>
		page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first();

	test("Next button advances one slide", async ({ page }) => {
		await expect(counter(page)).toHaveText(/^\s*1\s*\/\s*\d+\s*$/);
		await page.getByRole("button", { name: "Next slide" }).click();
		await expect(counter(page)).toHaveText(/^\s*2\s*\/\s*\d+\s*$/);
	});

	test("Prev button goes back one slide", async ({ page }) => {
		await page.getByRole("button", { name: "Next slide" }).click();
		await expect(counter(page)).toHaveText(/^\s*2\s*\/\s*\d+\s*$/);
		await page.getByRole("button", { name: "Previous slide" }).click();
		await expect(counter(page)).toHaveText(/^\s*1\s*\/\s*\d+\s*$/);
	});

	test("ArrowRight / ArrowLeft keys navigate", async ({ page }) => {
		await page.locator("body").click(); // ensure focus
		await page.keyboard.press("ArrowRight");
		await expect(counter(page)).toHaveText(/^\s*2\s*\/\s*\d+\s*$/);
		await page.keyboard.press("ArrowLeft");
		await expect(counter(page)).toHaveText(/^\s*1\s*\/\s*\d+\s*$/);
	});

	test("Home / End jump to first / last user slide", async ({ page }) => {
		await page.keyboard.press("End");
		await expect(counter(page)).toHaveText(/^\s*27\s*\/\s*27\s*$/);
		await page.keyboard.press("Home");
		await expect(counter(page)).toHaveText(/^\s*1\s*\/\s*27\s*$/);
	});

	test("g 5 Enter jumps to slide 5", async ({ page }) => {
		await page.locator("body").click();
		await page.keyboard.press("g");
		await page.keyboard.press("5");
		await page.keyboard.press("Enter");
		await expect(counter(page)).toHaveText(/^\s*5\s*\/\s*27\s*$/);
	});

	test("Backspace returns to previous jump position", async ({ page }) => {
		// Establish history: slide 1 → jump to 10
		await page.keyboard.press("g");
		await page.keyboard.press("1");
		await page.keyboard.press("0");
		await page.keyboard.press("Enter");
		await expect(counter(page)).toHaveText(/^\s*10\s*\/\s*27\s*$/);
		// Backspace should pop to where we came from (1)
		await page.keyboard.press("Backspace");
		await expect(counter(page)).toHaveText(/^\s*1\s*\/\s*27\s*$/);
	});
});
```

- [ ] **Step 2: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/slide-navigation.spec.ts --reporter=list
```

Expected: all 6 tests pass. If "End" / "Home" land on a non-27 number, inspect the actual count rendered and adjust the regex (the demo `.pdfpc` has 27 user slides; this is the source of truth).

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/slide-navigation.spec.ts
git commit -m "test(e2e): scenario 4 - slide navigation"
```

---

## Task 11: Scenario 5 — `presenter-modes.spec.ts`

**Files:**
- Create: `e2e/tests/presenter-modes.spec.ts`

`ModeForm.tsx` renders three buttons with `aria-label`s: "Freeze projection", "Blackout projection", "Show overview". Frozen/Blackout are toggle buttons; Overview opens a dialog.

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

test.describe("presenter mode toggles", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([fixtures.pdf, fixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/);
		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toBeVisible({ timeout: 15_000 });
		const presentation = await presentationPromise;
		presentationCloser = async () => {
			if (!presentation.isClosed()) await presentation.close();
		};
	});

	test.afterEach(async () => {
		await presentationCloser?.();
		presentationCloser = null;
	});

	test("Freeze toggles aria-pressed", async ({ page }) => {
		const btn = page.getByRole("button", { name: "Freeze projection" });
		await expect(btn).toHaveAttribute("aria-pressed", "false");
		await btn.click();
		await expect(btn).toHaveAttribute("aria-pressed", "true");
		await btn.click();
		await expect(btn).toHaveAttribute("aria-pressed", "false");
	});

	test("Blackout toggles aria-pressed", async ({ page }) => {
		const btn = page.getByRole("button", { name: "Blackout projection" });
		await expect(btn).toHaveAttribute("aria-pressed", "false");
		await btn.click();
		await expect(btn).toHaveAttribute("aria-pressed", "true");
		await btn.click();
		await expect(btn).toHaveAttribute("aria-pressed", "false");
	});

	test("Overview button opens an overview dialog", async ({ page }) => {
		await page.getByRole("button", { name: "Show overview" }).click();
		// OverviewDialog should appear; assert role=dialog
		await expect(page.getByRole("dialog")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByRole("dialog")).toBeHidden();
	});
});
```

- [ ] **Step 2: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/presenter-modes.spec.ts --reporter=list
```

Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/presenter-modes.spec.ts
git commit -m "test(e2e): scenario 5 - presenter mode toggles"
```

---

## Task 12: Scenario 6 — `timer.spec.ts`

**Files:**
- Create: `e2e/tests/timer.spec.ts`

Timer renders Play/Pause and Reset icon buttons (`Timer.tsx:407-431`). They have no `aria-label`; they have `lucide-react` SVGs only. We can locate them by relative position from the slide counter or by their SVG's `data-icon` attribute. The cleanest path is to add aria-labels (similar to Task 9). To avoid scope creep, we use the timer text format (digital `00:00:00`) and the order of buttons.

- [ ] **Step 1: Add `aria-label` to timer buttons**

Modify `src/routes/$locale/(main)/-presenter/Timer.tsx:407-431` to add aria-labels.

First, add message keys to `messages/en.json`:

```json
"presenter_timer_toggle_aria": "Start or pause timer",
"presenter_timer_reset_aria": "Reset timer",
```

And to `messages/ja.json`:

```json
"presenter_timer_toggle_aria": "タイマーの開始/一時停止",
"presenter_timer_reset_aria": "タイマーをリセット",
```

Then in `Timer.tsx`, add `import * as m from "#src/paraglide/messages.js";` if not present (it already imports getLocale from runtime, so just import messages module). Update the two buttons:

```tsx
<Button
	type="button"
	variant={view.isRunning ? "secondary" : "default"}
	size="icon-sm"
	aria-label={m.presenter_timer_toggle_aria()}
	onClick={() => dispatch({ type: "TOGGLE", nowMs: Date.now() })}
>
	{view.isRunning ? <PauseIcon /> : <PlayIcon />}
</Button>

<Button
	type="button"
	variant="ghost"
	size="icon-sm"
	aria-label={m.presenter_timer_reset_aria()}
	onClick={() =>
		dispatch({
			type: "RESET",
			nowMs: Date.now(),
			hasStartedAfterReset: pageNumber > 1,
		})
	}
>
	<RotateCcwIcon />
</Button>
```

- [ ] **Step 2: Type-check**

Run:

```bash
pnpm tsc -b
```

Expected: no errors.

- [ ] **Step 3: Run existing tests**

Run:

```bash
pnpm test
```

Expected: all green.

- [ ] **Step 4: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

test.describe("timer", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([fixtures.pdf, fixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/);
		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toBeVisible({ timeout: 15_000 });
		const presentation = await presentationPromise;
		presentationCloser = async () => {
			if (!presentation.isClosed()) await presentation.close();
		};
	});

	test.afterEach(async () => {
		await presentationCloser?.();
		presentationCloser = null;
	});

	test("Reset returns the timer to a zero-prefixed state", async ({ page }) => {
		// Click toggle to start, wait > 1s so the timer ticks past 00:00.
		await page
			.getByRole("button", { name: "Start or pause timer" })
			.click();
		await page.waitForTimeout(1500);

		// Reset
		await page.getByRole("button", { name: "Reset timer" }).click();

		// Demo .pdfpc has duration: 25 (minutes). After reset the displayed time
		// should match the duration format (e.g. "25:00:00" or "00:25:00").
		// Concretely: it should NOT be a strictly increasing arbitrary value;
		// we assert it shows the duration with seconds == 00.
		const timer = page.locator("span.font-mono.tabular-nums").first();
		await expect(timer).toHaveText(/00$/);
	});
});
```

- [ ] **Step 5: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/timer.spec.ts --reporter=list
```

Expected: 1 passed. If the `:00$` regex doesn't match, log the rendered text once via `console.log(await timer.textContent())` and adjust.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/ja.json src/routes/'$locale'/'(main)'/-presenter/Timer.tsx e2e/tests/timer.spec.ts
git commit -m "test(e2e): scenario 6 - timer + label timer buttons"
```

---

## Task 13: Scenario 8 — `pdfpc-note.spec.ts`

**Files:**
- Create: `e2e/tests/pdfpc-note.spec.ts`

The first slide of `pdfpw-demo.pdfpc` has the note `"Welcome! このデモはPDFPWの機能を紹介します。\n\nPDFPWはブラウザで動くpdfpc互換のプレゼンターコンソールです。"`. Slide 2 (PDF page 2) has no note → "No notes for this slide" should appear.

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

test.describe("pdfpc note display", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([fixtures.pdf, fixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/);
		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toBeVisible({ timeout: 15_000 });
		const presentation = await presentationPromise;
		presentationCloser = async () => {
			if (!presentation.isClosed()) await presentation.close();
		};
	});

	test.afterEach(async () => {
		await presentationCloser?.();
		presentationCloser = null;
	});

	test("shows pdfpc note on first slide", async ({ page }) => {
		await expect(page.getByText("Welcome!")).toBeVisible();
		await expect(
			page.getByText("PDFPWはブラウザで動くpdfpc互換のプレゼンターコンソールです"),
		).toBeVisible();
	});

	test("shows empty placeholder when slide has no note", async ({ page }) => {
		// Slide 2 in the demo has no note (idx 1, label "1")
		await page.getByRole("button", { name: "Next slide" }).click();
		await expect(page.getByText("No notes for this slide")).toBeVisible();
	});
});
```

- [ ] **Step 2: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/pdfpc-note.spec.ts --reporter=list
```

Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/pdfpc-note.spec.ts
git commit -m "test(e2e): scenario 8 - pdfpc note display"
```

---

## Task 14: Scenario 9 — `locale-switch.spec.ts`

**Files:**
- Create: `e2e/tests/locale-switch.spec.ts`

LocaleSwitcher renders two `<button>`s with `aria-label="English"` and `aria-label="日本語"`. Switching updates URL prefix (`/en` ↔ `/ja`) and writes `pdfpw:locale` to localStorage.

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { resetAppState } from "../helpers/reset-state";

test.describe("locale switcher", () => {
	test.beforeEach(async ({ page }) => {
		await resetAppState(page);
	});

	test("switching to ja navigates to /ja and persists in localStorage", async ({ page }) => {
		await page.goto("/en");
		await page.getByRole("button", { name: "日本語" }).click();
		await page.waitForURL(/\/ja(\/|$)/);
		expect(await page.evaluate(() => localStorage.getItem("pdfpw:locale"))).toBe("ja");
	});

	test("switching back to en navigates to /en and persists", async ({ page }) => {
		await page.goto("/ja");
		await page.getByRole("button", { name: "English" }).click();
		await page.waitForURL(/\/en(\/|$)/);
		expect(await page.evaluate(() => localStorage.getItem("pdfpw:locale"))).toBe("en");
	});

	test("aria-pressed reflects the active locale", async ({ page }) => {
		await page.goto("/en");
		await expect(page.getByRole("button", { name: "English" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.getByRole("button", { name: "日本語" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});
```

- [ ] **Step 2: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/locale-switch.spec.ts --reporter=list
```

Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/locale-switch.spec.ts
git commit -m "test(e2e): scenario 9 - locale switcher"
```

---

## Task 15: Scenario 3 — `recent-files.spec.ts`

**Files:**
- Create: `e2e/tests/recent-files.spec.ts`

After uploading, the user can click the home logo / back link. `LibrarySection` renders recent files only when FSA is supported AND a thumbnail/handle was saved. In Chromium FSA is supported but the picker requires a real file dialog — for non-FSA path, history is saved as a snapshot when `saveHistory` is true (default).

The robust path: upload via `<input type=file>` (which produces a `File`, not a handle), saveHistory is true by default → snapshot saved → after navigating back to home, the file appears in the LibrarySection.

The library list renders recent file names. Each card has a delete button (`aria-label` from `library_delete_aria`: "Delete from library").

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

test.describe("recent files", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([fixtures.pdf, fixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/);
		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toBeVisible({ timeout: 15_000 });
		const presentation = await presentationPromise;
		presentationCloser = async () => {
			if (!presentation.isClosed()) await presentation.close();
		};
	});

	test.afterEach(async () => {
		await presentationCloser?.();
		presentationCloser = null;
	});

	test("uploaded file appears in library after returning home", async ({ page }) => {
		await page.goto("/en");
		// LibrarySection lists each recent by name; the file name from fixture is "pdfpw-demo.pdf"
		await expect(page.getByText("pdfpw-demo.pdf").first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("deleting a recent file removes it from the library", async ({ page }) => {
		await page.goto("/en");
		await expect(page.getByText("pdfpw-demo.pdf").first()).toBeVisible();

		await page.getByRole("button", { name: "Delete from library" }).first().click();

		await expect(page.getByText("pdfpw-demo.pdf")).toHaveCount(0);
	});
});
```

- [ ] **Step 2: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/recent-files.spec.ts --reporter=list
```

Expected: 2 passed. If FSA mode is detected by the test browser and the snapshot path is skipped, locate the actual rendered recent list and adjust the matcher.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/recent-files.spec.ts
git commit -m "test(e2e): scenario 3 - recent files library"
```

---

## Task 16: Scenario 7 — `presenter-presentation-sync.spec.ts`

**Files:**
- Create: `e2e/tests/presenter-presentation-sync.spec.ts`

The presentation page renders a connecting screen (`presentation_connecting`: "Connecting…") until the broadcast initialize message arrives. `-SlideStage.tsx` (presentation side) renders the slide; `-Menu.tsx` shows the page indicator.

We assert: changing slide on presenter eventually reflects in presentation, via the menu's page-counter and the blackout wrapper class.

**Selector reference (already verified):**
- Presentation `-Menu.tsx` renders `<span class="font-mono text-[11px] text-fg tabular-nums">{currentSlidePage} / {pdfpcConfig.pages.length}</span>` (e.g. `"1 / 27"`).
- The menu auto-hides after 2.5s of no pointer activity. Tests must move the mouse on the presentation page to keep the counter visible (`presentation.mouse.move(x, y)`).
- When blackout is active, the wrapping div in `presentation/index.tsx:323-330` gets `opacity-0`. Asserting that wrapper's classlist is the reliable blackout signal.

- [ ] **Step 1: Write the failing spec**

```ts
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

async function nudgePresentation(presentation: Page): Promise<void> {
	// Keeps the auto-hiding menu visible (HIDE_DELAY_MS = 2500 in -Menu.tsx).
	await presentation.mouse.move(10, 10);
	await presentation.mouse.move(20, 20);
}

async function uploadAndCapture(
	page: Page,
	context: BrowserContext,
): Promise<Page> {
	await resetAppState(page);
	const presentationPromise = context.waitForEvent("page");
	await page
		.locator('input[type="file"][accept*=".pdf"]')
		.setInputFiles([fixtures.pdf, fixtures.pdfpc]);
	await page.waitForURL(/\/(en|ja)\/presenter/);
	const presentation = await presentationPromise;
	await presentation.waitForLoadState("domcontentloaded");
	await expect(presentation.getByText(/Connecting|接続/)).toBeHidden({
		timeout: 15_000,
	});
	return presentation;
}

test.describe("presenter ↔ presentation sync", () => {
	test("next slide on presenter advances presentation", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);
		await nudgePresentation(presentation);

		const presentationCounter = presentation
			.locator("span.font-mono.tabular-nums")
			.filter({ hasText: /^\s*\d+\s*\/\s*\d+\s*$/ })
			.first();
		await expect(presentationCounter).toHaveText(/^\s*1\s*\/\s*27\s*$/);

		await page.getByRole("button", { name: "Next slide" }).click();

		await expect(
			page.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first(),
		).toHaveText(/^\s*2\s*\/\s*27\s*$/);

		await nudgePresentation(presentation);
		await expect(presentationCounter).toHaveText(/^\s*2\s*\/\s*27\s*$/, {
			timeout: 5_000,
		});

		await presentation.close();
	});

	test("blackout on presenter blacks out presentation", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// presentation/index.tsx wraps the Menu in a div whose className gains
		// `opacity-0` only when isBlackout is true.
		const blackoutWrapper = presentation
			.locator("div.absolute.bottom-24.w-full.flex.justify-center")
			.first();
		await expect(blackoutWrapper).not.toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/);

		await page.getByRole("button", { name: "Blackout projection" }).click();

		await expect(blackoutWrapper).toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/, {
			timeout: 5_000,
		});

		await presentation.close();
	});
});
```

- [ ] **Step 2: Run and verify**

Run:

```bash
pnpm e2e e2e/tests/presenter-presentation-sync.spec.ts --reporter=list
```

Expected: 2 passed. Sync timing on broadcast may be slow; if flaky, **diagnose** rather than masking with `waitForTimeout`. Likely fixes: longer timeout on the `toHaveText` (Playwright auto-retries already), or wait on a specific element that actually receives the broadcast update.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/presenter-presentation-sync.spec.ts
git commit -m "test(e2e): scenario 7 - presenter ↔ presentation sync"
```

---

## Task 17: Remove `pdfjs-dist` mock from `thumbnail.test.ts`

**Files:**
- Modify: `src/lib/thumbnail.test.ts`

- [ ] **Step 1: Replace the mocked spec with a real-PDF spec**

Overwrite `src/lib/thumbnail.test.ts` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demoPdfUrl from "../../demo/pdfpw-demo.pdf?url";
import { generateThumbnail } from "./thumbnail.ts";

async function loadDemoPdfFile(): Promise<File> {
	const res = await fetch(demoPdfUrl);
	const blob = await res.blob();
	return new File([blob], "pdfpw-demo.pdf", { type: "application/pdf" });
}

describe("generateThumbnail", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns a JPEG data URL for a real PDF", async () => {
		const file = await loadDemoPdfFile();
		const result = await generateThumbnail(file);
		expect(result).toMatch(/^data:image\/jpeg;base64,/);
		// A rendered page produces a non-trivial JPEG (>1 KB encoded).
		expect((result ?? "").length).toBeGreaterThan(1000);
	});

	it("returns null for a corrupted PDF", async () => {
		const broken = new File([new Uint8Array([0, 0, 0, 0])], "broken.pdf", {
			type: "application/pdf",
		});
		const result = await generateThumbnail(broken);
		expect(result).toBeNull();
	});

	it("returns null when canvas getContext returns null", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: forcing the failure branch
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null as any);
		const file = await loadDemoPdfFile();
		const result = await generateThumbnail(file);
		expect(result).toBeNull();
	});
});
```

Notes:
- The `vi.mock("pdfjs-dist", ...)` and `vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", ...)` blocks are removed entirely.
- `?url` import resolves to a Vite-served URL during Vitest browser mode; `fetch(url)` reads the actual PDF bytes.
- The `beforeEach` block that built mocked PDF documents is gone — no longer applicable.
- `vi` import is kept only because `vi.spyOn` and `vi.restoreAllMocks` are still used in the canvas test.

- [ ] **Step 2: Run the test**

Run:

```bash
pnpm test src/lib/thumbnail.test.ts
```

Expected: 3 passed across both Chromium and Firefox.

- [ ] **Step 3: Commit**

```bash
git add src/lib/thumbnail.test.ts
git commit -m "test(thumbnail): remove pdfjs-dist mock, use real fixture"
```

---

## Task 18: Add `e2e` job to PR check workflow

**Files:**
- Modify: `.github/workflows/pr-check.yaml`

- [ ] **Step 1: Append the e2e job**

Add after the existing `build` job (keeping the `test` and `build` jobs unchanged):

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
      - name: Run E2E tests
        run: pnpm e2e
      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Validate YAML syntax locally**

Run:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-check.yaml'))"
```

Expected: no output (silent success). If `python3` lacks PyYAML, use `yamllint` if installed, or just visually inspect indentation.

- [ ] **Step 3: Run the full e2e suite locally one last time**

Run:

```bash
pnpm e2e --reporter=list
```

Expected: all specs from tasks 8–16 pass.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pr-check.yaml
git commit -m "ci: run E2E tests on PRs"
```

---

## Final Verification

- [ ] **Step 1: Type-check**

```bash
pnpm tsc -b
```

Expected: no errors.

- [ ] **Step 2: Lint**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Run all unit tests**

```bash
pnpm test
```

Expected: all green (incl. revised `thumbnail.test.ts`).

- [ ] **Step 4: Run all E2E tests**

```bash
pnpm e2e
```

Expected: all 8 spec files green (~15 individual tests across Chromium).

- [ ] **Step 5: Run build**

```bash
pnpm build
```

Expected: success — confirms message keys added in tasks 9 & 12 are included in the production bundle.

---

## Out of Scope

- URL-query auto-load (`?pdf=`)
- Typst input flow
- Drag & drop
- Visual regression / screenshot comparison
- Cross-browser (Firefox / WebKit) E2E — Vitest browser mode already covers Chromium + Firefox at the unit level.
