import { test, expect } from "../helpers/test-fixtures";
import { resetAppState } from "../helpers/reset-state";

test.describe("timer", () => {
	let presentationCloser: (() => Promise<void>) | null = null;

	test.beforeEach(async ({ page, context, uniqueFixtures }) => {
		await resetAppState(page);
		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([uniqueFixtures.pdf, uniqueFixtures.pdfpc]);
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
