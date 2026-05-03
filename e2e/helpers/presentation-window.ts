import type { BrowserContext, Page } from "@playwright/test";

/**
 * Wait for the presentation window opened by `proceedWithPdf` (window.open).
 * Pair with the action that triggers it (e.g. setInputFiles).
 */
export async function capturePresentationPage(
	context: BrowserContext,
	trigger: () => Promise<void>,
): Promise<Page> {
	const [presentation] = await Promise.all([
		context.waitForEvent("page"),
		trigger(),
	]);
	await presentation.waitForLoadState("domcontentloaded");
	return presentation;
}
