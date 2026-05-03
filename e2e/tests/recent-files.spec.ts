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
