import type { Page } from "@playwright/test";

/**
 * Reset client-side state to a deterministic baseline:
 *
 * - Drop the `pdfpw` IndexedDB store (recent files, settings).
 * - Clear `localStorage` and `sessionStorage`.
 * - Seed `pdfpw:locale = "en"` so role/aria-label selectors render in English
 *   regardless of the host's `navigator.language`.
 *
 * `sessionStorage` notably holds the broadcast pair-id
 * (`pdfpw:pairId:<fileName>`); leaving it intact across tests can leak pairing
 * state and make multi-window behavior non-deterministic.
 *
 * Navigates to `/en` directly (bypassing the `/` → `/<locale>` <Navigate>
 * dance) and reloads after seeding so the app picks up the seeded locale.
 */
export async function resetAppState(page: Page): Promise<void> {
	await page.goto("/en");
	await page.evaluate(async () => {
		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase("pdfpw");
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
			req.onblocked = () => resolve();
		});
		localStorage.clear();
		sessionStorage.clear();
		localStorage.setItem("pdfpw:locale", "en");
	});
	await page.goto("/en");
}
