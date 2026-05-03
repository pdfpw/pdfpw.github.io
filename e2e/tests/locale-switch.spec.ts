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
