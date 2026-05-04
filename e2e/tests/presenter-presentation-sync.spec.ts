import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

async function nudgePresentation(presentation: Page): Promise<void> {
	// Keeps the auto-hiding menu visible (HIDE_DELAY_MS = 2500 in -Menu.tsx).
	// CI is slower than local — do several nudges across a wider area to make
	// sure pointermove handlers see them and reset the hide timer.
	await presentation.mouse.move(100, 100);
	await presentation.mouse.move(120, 110);
	await presentation.mouse.move(150, 130);
}

/**
 * Wait until the presentation page has fully initialized — i.e. the broadcast
 * pairing succeeded, init data was received, and PresentationView is rendered.
 *
 * Asserting "Connecting" is hidden is a NEGATIVE signal that also resolves
 * instantly when the presentation enters an error fallback (the loading text
 * never renders in that case). We wait for a POSITIVE signal: the SlideStage
 * canvas, which only mounts once `pdfProxy` is resolved.
 */
async function waitForPresentationReady(presentation: Page): Promise<void> {
	const canvas = presentation.locator("canvas").first();
	await canvas.waitFor({ state: "visible", timeout: 30_000 });
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
	await waitForPresentationReady(presentation);
	return presentation;
}

test.describe("presenter ↔ presentation sync", () => {
	test("next slide on presenter advances presentation", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		const presentationCounter = presentation
			.locator("span.font-mono.tabular-nums")
			.filter({ hasText: /^\s*\d+\s*\/\s*\d+\s*$/ })
			.first();

		// Start a background loop that keeps the auto-hiding menu visible while
		// we run assertions. Stop the loop at the end of the test.
		let keepNudging = true;
		const nudgeLoop = (async () => {
			while (keepNudging) {
				await nudgePresentation(presentation).catch(() => {});
				await presentation.waitForTimeout(500);
			}
		})();

		try {
			await expect(presentationCounter).toHaveText(/^\s*1\s*\/\s*27\s*$/, {
				timeout: 10_000,
			});

			await page.getByRole("button", { name: "Next slide" }).click();

			// Presenter footer counter is in NextPrevFooter (`div.text-2xl`),
			// distinct from NextSlide preview which uses raw PDF page numbers.
			const presenterCounter = page.locator(
				'div.text-2xl:text-matches("^\\\\s*\\\\d+\\\\s*\\\\/\\\\s*\\\\d+\\\\s*$")',
			);
			await expect(presenterCounter).toHaveText(/^\s*2\s*\/\s*27\s*$/);

			await expect(presentationCounter).toHaveText(/^\s*2\s*\/\s*27\s*$/, {
				timeout: 10_000,
			});
		} finally {
			keepNudging = false;
			await nudgeLoop;
		}

		await presentation.close();
	});

	test("blackout on presenter blacks out presentation", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// presentation/index.tsx wraps the Menu in a div whose className gains
		// `opacity-0` only when isBlackout is true.
		const blackoutWrapper = presentation
			.locator("div.absolute.bottom-24.w-full.flex.justify-center")
			.first();
		await expect(blackoutWrapper).not.toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/, {
			timeout: 10_000,
		});

		await page.getByRole("button", { name: "Blackout projection" }).click();

		await expect(blackoutWrapper).toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/, {
			timeout: 10_000,
		});

		await presentation.close();
	});
});
