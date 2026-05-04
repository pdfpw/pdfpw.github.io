import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { fixtures } from "../fixtures/pdfs";
import { resetAppState } from "../helpers/reset-state";

/**
 * Tool keys (from src/lib/keybindings.ts):
 * - `l`      → laser toggle
 * - `d`      → pen toggle
 * - `e`      → erase pen strokes
 * - `Escape` → exit tool
 *
 * Both presenter and presentation register `useToolShortcut` with scope "both",
 * so the same keys work from either window. State changes are broadcast via
 * `sendTool` (src/broadcast/tools.ts), so a tool change on either side updates
 * the other's PointerOverlay.
 */

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

	// Wait for BOTH windows to render their slide canvas. The presenter's
	// useToolShortcut / useToolBroadcast hooks are inside PresenterContent
	// which is suspended on PDF.js + pdfpc parsing. Pressing tool keys before
	// these hooks mount silently no-ops, so without this wait the test fails
	// flakily under parallel load on a dev server (Vite serves modules slower
	// when many specs request them concurrently).
	await Promise.all([
		page.locator("canvas").first().waitFor({ state: "visible", timeout: 30_000 }),
		presentation
			.locator("canvas")
			.first()
			.waitFor({ state: "visible", timeout: 30_000 }),
	]);
	return presentation;
}

/**
 * The PointerOverlay portal renders this wrapper into <body> only when
 * toolMode !== "none" or there are pen strokes. Its presence (or absence)
 * is the most stable signal for "is a tool currently active".
 */
function pointerOverlayPortal(page: Page) {
	return page.locator("body > div.fixed.pointer-events-none.z-50");
}

/**
 * Pen strokes render as <polyline stroke="#ef4444"> inside the overlay's <svg>.
 * Counting these is the most reliable way to verify pen drawing arrived.
 */
function penPolylines(page: Page) {
	return page.locator('body > div.fixed.pointer-events-none.z-50 svg polyline[stroke="#ef4444"]');
}

/**
 * The laser dot wrapper has inline `style="display: none"` initially and is
 * flipped to `display: ""` (computed: `block`) when laser mode is active and
 * the laser position atom is non-null.
 */
function laserDotWrapper(page: Page) {
	// The wrapper is the only descendant of the portal carrying width:0 inline
	// style (see PointerOverlay.tsx LaserDot).
	return page.locator('body > div.fixed.pointer-events-none.z-50 div[style*="width: 0"]').first();
}

async function getCenterOfCanvas(page: Page): Promise<{ x: number; y: number }> {
	const box = await page.locator("canvas").first().boundingBox();
	if (!box) throw new Error("canvas not found");
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// These tests exercise heavy multi-window pointer/keyboard interactions and
// share a BroadcastChannel keyed on the demo file name. Running them in
// parallel against a single Vite dev server has surfaced flake (overlay
// portal not mounting in time when tool keys race ahead of PresenterContent
// suspense). CI runs workers=1 so this is a no-op there; locally it brings
// behavior in line with CI.
test.describe.configure({ mode: "serial" });

test.describe("pointer tools (laser + pen)", () => {
	test("laser activated on presenter syncs dot to presentation", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// Presenter focuses its window then presses `l` to enable laser.
		// focus body so window-level keydown listeners receive the key
		await page.locator("body").press("l");

		// Moving the pointer on presenter sends pointer-move broadcast.
		const c = await getCenterOfCanvas(page);
		await page.mouse.move(c.x, c.y);
		// Slight extra movement so coalesced events flush a sample.
		await page.mouse.move(c.x + 5, c.y + 5);
		await page.mouse.move(c.x + 10, c.y + 10);

		// PointerOverlay portal must appear on BOTH sides (toolMode === "laser"
		// is broadcast as `tool-mode`).
		await expect(pointerOverlayPortal(page)).toBeAttached({ timeout: 5_000 });
		await expect(pointerOverlayPortal(presentation)).toBeAttached({ timeout: 5_000 });

		// The laser dot on the presentation side gets `display: block` once a
		// pointer-move broadcast arrives with a position.
		await expect(laserDotWrapper(presentation)).toHaveCSS("display", "block", {
			timeout: 10_000,
		});

		await presentation.close();
	});

	test("laser activated on presentation syncs dot to presenter", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// Click presentation body to give it focus, then press `l`.
		// focus body so window-level keydown listeners receive the key
		await presentation.locator("body").press("l");

		const c = await getCenterOfCanvas(presentation);
		await presentation.mouse.move(c.x, c.y);
		await presentation.mouse.move(c.x + 5, c.y + 5);
		await presentation.mouse.move(c.x + 10, c.y + 10);

		await expect(pointerOverlayPortal(presentation)).toBeAttached({ timeout: 5_000 });
		await expect(pointerOverlayPortal(page)).toBeAttached({ timeout: 5_000 });
		await expect(laserDotWrapper(page)).toHaveCSS("display", "block", {
			timeout: 10_000,
		});

		await presentation.close();
	});

	test("pen drawing on presenter appears on presentation", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// focus body so window-level keydown listeners receive the key
		await page.locator("body").press("d");

		// Draw a short stroke across the presenter canvas.
		const c = await getCenterOfCanvas(page);
		await page.mouse.move(c.x - 40, c.y);
		await page.mouse.down();
		await page.mouse.move(c.x - 20, c.y + 10, { steps: 5 });
		await page.mouse.move(c.x, c.y + 20, { steps: 5 });
		await page.mouse.move(c.x + 30, c.y + 10, { steps: 5 });
		await page.mouse.up();

		// Both sides should now have at least one polyline.
		await expect(penPolylines(page)).toHaveCount(1, { timeout: 5_000 });
		await expect(penPolylines(presentation)).toHaveCount(1, { timeout: 10_000 });

		await presentation.close();
	});

	test("pen drawing on presentation appears on presenter", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// focus body so window-level keydown listeners receive the key
		await presentation.locator("body").press("d");

		const c = await getCenterOfCanvas(presentation);
		await presentation.mouse.move(c.x - 40, c.y);
		await presentation.mouse.down();
		await presentation.mouse.move(c.x - 20, c.y + 10, { steps: 5 });
		await presentation.mouse.move(c.x, c.y + 20, { steps: 5 });
		await presentation.mouse.move(c.x + 30, c.y + 10, { steps: 5 });
		await presentation.mouse.up();

		await expect(penPolylines(presentation)).toHaveCount(1, { timeout: 5_000 });
		await expect(penPolylines(page)).toHaveCount(1, { timeout: 10_000 });

		await presentation.close();
	});

	test("erase clears pen strokes on both windows", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// Draw on presenter
		// focus body so window-level keydown listeners receive the key
		await page.locator("body").press("d");
		const c = await getCenterOfCanvas(page);
		await page.mouse.move(c.x - 30, c.y);
		await page.mouse.down();
		await page.mouse.move(c.x + 30, c.y + 20, { steps: 6 });
		await page.mouse.up();

		await expect(penPolylines(page)).toHaveCount(1, { timeout: 5_000 });
		await expect(penPolylines(presentation)).toHaveCount(1, { timeout: 10_000 });

		// Erase
		await page.locator("body").press("e");

		await expect(penPolylines(page)).toHaveCount(0, { timeout: 5_000 });
		await expect(penPolylines(presentation)).toHaveCount(0, { timeout: 5_000 });

		await presentation.close();
	});

	test("Escape exits tool mode and removes the overlay", async ({ page, context }) => {
		const presentation = await uploadAndCapture(page, context);

		// focus body so window-level keydown listeners receive the key
		await page.locator("body").press("l");

		// Overlay portal exists in both windows once tool mode is non-none.
		await expect(pointerOverlayPortal(page)).toBeAttached({ timeout: 5_000 });
		await expect(pointerOverlayPortal(presentation)).toBeAttached({ timeout: 5_000 });

		await page.locator("body").press("Escape");

		// With no strokes and toolMode back to none, the portal unmounts.
		await expect(pointerOverlayPortal(page)).toHaveCount(0, { timeout: 5_000 });
		await expect(pointerOverlayPortal(presentation)).toHaveCount(0, { timeout: 5_000 });

		await presentation.close();
	});
});
