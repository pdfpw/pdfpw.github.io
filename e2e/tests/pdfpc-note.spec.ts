import { test, expect } from "../helpers/test-fixtures";
import { resetAppState } from "../helpers/reset-state";

test.describe("pdfpc note display", () => {
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
