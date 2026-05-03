import type { Page } from "@playwright/test";

/**
 * Clear IndexedDB ("pdfpw" DB defined in src/lib/recent-store.ts) and localStorage,
 * then reload. Call once per test before navigating to feature pages.
 */
export async function resetAppState(page: Page): Promise<void> {
	// "/" client-redirects to "/{locale}" via <Navigate>. Wait for the redirect
	// to finish before evaluating, otherwise the execution context can be
	// destroyed mid-evaluate.
	await page.goto("/");
	await page.waitForURL(/\/(en|ja)\/?$/, { timeout: 15_000 });
	await page.evaluate(async () => {
		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase("pdfpw");
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
			req.onblocked = () => resolve();
		});
		localStorage.clear();
	});
	await page.reload();
}
