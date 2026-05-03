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
