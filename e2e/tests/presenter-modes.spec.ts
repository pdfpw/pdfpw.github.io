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
