import { test, expect } from "../helpers/test-fixtures";
import { resetAppState } from "../helpers/reset-state";

test.describe("recent files", () => {
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

	test("uploaded file appears in library after returning home", async ({ page, uniqueFixtures }) => {
		await page.goto("/en");
		// LibrarySection lists each recent by name; the file name from fixture is dynamic per worker.
		await expect(page.getByText(uniqueFixtures.pdfName).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("deleting a recent file removes it from the library", async ({ page, uniqueFixtures }) => {
		await page.goto("/en");
		await expect(page.getByText(uniqueFixtures.pdfName).first()).toBeVisible();

		await page.getByRole("button", { name: "Delete from library" }).first().click();

		await expect(page.getByText(uniqueFixtures.pdfName)).toHaveCount(0);
	});
});
