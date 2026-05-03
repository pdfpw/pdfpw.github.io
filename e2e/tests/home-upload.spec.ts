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
