import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../helpers/test-fixtures";
import { resetAppState } from "../helpers/reset-state";

/**
 * Slide navigation E2E coverage (Plan Task 10 / Scenario 4).
 *
 * IMPORTANT — counter semantics:
 * The footer counter in `NextPrevFooter.tsx` shows
 *   `{user-slide-index + 1} / {pdfpcConfig.pages.length}`,
 * i.e. the *user slide* (overlay group) for the current PDF page.
 *
 * However, the underlying state (`pageNumber`) and the operations
 * `nextSlide`, `prevSlide`, `jumpToSlide`, `jumpToFirstSlide`,
 * `jumpToLastSlide` all operate on **PDF page numbers**, not user-slide
 * indices (see `src/routes/$locale/(main)/presenter.tsx`).
 *
 * Demo `pdfpw-demo.pdfpc` has 74 PDF pages (overlays) grouped into 27 user
 * slides (labels "0".."26"). The plan's task description assumed
 * user-slide-indexed jumps; the actual implementation uses PDF page
 * indices, so:
 *   - `g 7 Enter` → PDF page 7 = label "4" = user slide 5  ("5 / 27")
 *   - `g 1 0 Enter` → PDF page 10 = label "5" overlay 2 = user slide 6
 *
 * Home / End / Next / Prev still produce expected counter values
 * because the first PDF page (1) and the last PDF page (74) coincide
 * with the first and last user slide, and Next/Prev only need to advance
 * one PDF page to also advance one user slide from the initial state.
 */

test.describe("slide navigation", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context, uniqueFixtures }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([uniqueFixtures.pdf, uniqueFixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/);
		await expect(counter(page)).toBeVisible({ timeout: 15_000 });
		const presentation = await presentationPromise;
		presentationCloser = async () => {
			if (!presentation.isClosed()) await presentation.close();
		};
	});

	test.afterEach(async () => {
		await presentationCloser?.();
		presentationCloser = null;
	});

	// The footer counter is the <div class="text-2xl"> in NextPrevFooter
	// rendering "{current_user_slide + 1} / {pdfpcConfig.pages.length}".
	// Other counters exist on the page (e.g. NextSlide preview shows
	// "{nextPdfPage} / {numPdfPages}"), so we scope by the text-2xl class.
	const counter = (page: Page): Locator =>
		page.locator(
			'div.text-2xl:text-matches("^\\\\s*\\\\d+\\\\s*\\\\/\\\\s*\\\\d+\\\\s*$")',
		);

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

	test("g <pdf-page> Enter jumps to the matching user slide", async ({
		page,
	}) => {
		// PDF page 7 (idx 6) has label "4" → user slide 5 of 27.
		// `jumpToSlide` is implemented as a PDF-page jump, so the digits typed
		// into jump-mode are PDF page numbers; the counter reports the
		// resulting user slide.
		await page.locator("body").click();
		await page.keyboard.press("g");
		await page.keyboard.press("7");
		await page.keyboard.press("Enter");
		await expect(counter(page)).toHaveText(/^\s*5\s*\/\s*27\s*$/);
	});

	test("Backspace returns to previous jump position", async ({ page }) => {
		// Jump to PDF page 10 (idx 9, label "5", overlay 2) → user slide 6.
		await page.locator("body").click();
		await page.keyboard.press("g");
		await page.keyboard.press("1");
		await page.keyboard.press("0");
		await page.keyboard.press("Enter");
		await expect(counter(page)).toHaveText(/^\s*6\s*\/\s*27\s*$/);
		// Backspace pops history → back to PDF page 1 → user slide 1.
		await page.keyboard.press("Backspace");
		await expect(counter(page)).toHaveText(/^\s*1\s*\/\s*27\s*$/);
	});
});
