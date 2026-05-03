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

		// Presenter footer counter is in NextPrevFooter (`div.text-2xl`),
		// distinct from NextSlide preview which uses raw PDF page numbers.
		const presenterCounter = page.locator(
			'div.text-2xl:text-matches("^\\\\s*\\\\d+\\\\s*\\\\/\\\\s*\\\\d+\\\\s*$")',
		);
		await expect(presenterCounter).toHaveText(/^\s*2\s*\/\s*27\s*$/);

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
