import type { Page } from "@playwright/test";

/**
 * Clear IndexedDB ("pdfpw" DB defined in src/lib/recent-store.ts) and localStorage,
 * then reload. Call once per test before navigating to feature pages.
 */
export async function resetAppState(page: Page): Promise<void> {
	await page.goto("/");
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
