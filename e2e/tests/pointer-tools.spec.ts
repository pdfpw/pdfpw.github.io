import type { Page, BrowserContext } from "@playwright/test";
import { test, expect } from "../helpers/test-fixtures";
import { resetAppState } from "../helpers/reset-state";

type UniqueFixturesArg = {
	pdfName: string;
	pdfpcName: string;
	pdf: string;
	pdfpc: string;
};

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
	uniqueFixtures: UniqueFixturesArg,
): Promise<Page> {
	await resetAppState(page);
	const presentationPromise = context.waitForEvent("page");
	await page
		.locator('input[type="file"][accept*=".pdf"]')
		.setInputFiles([uniqueFixtures.pdf, uniqueFixtures.pdfpc]);
	await page.waitForURL(/\/(en|ja)\/presenter/);
	const presentation = await presentationPromise;
	await presentation.waitForLoadState("domcontentloaded");

	// Wait for BOTH windows to render their slide canvas. The presenter's
	// useToolShortcut / useToolBroadcast hooks are inside PresenterContent
	// which is suspended on PDF.js + pdfpc parsing. Pressing tool keys before
	// these hooks mount silently no-ops.
	await Promise.all([
		page.locator("canvas").first().waitFor({ state: "visible", timeout: 30_000 }),
		presentation
			.locator("canvas")
			.first()
			.waitFor({ state: "visible", timeout: 30_000 }),
	]);

	// Belt-and-suspenders: also wait for the presenter's slide counter to
	// render. Canvas paint can land slightly before the parent component's
	// useEffects commit, so this waits one tick further to ensure the global
	// keydown listener for tool shortcuts is attached.
	await page
		.locator('div.text-2xl', { hasText: /^\s*\d+\s*\/\s*\d+\s*$/ })
		.first()
		.waitFor({ state: "visible", timeout: 15_000 });
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

/**
 * Trigger an app keyboard shortcut. `useToolShortcut.onKeyDown` (in
 * use-tool-shortcut.ts) early-returns when `event.target` is an INPUT /
 * TEXTAREA / contentEditable element, so we explicitly focus body first.
 * Locator.press calls element.focus() then dispatches keydown via CDP, which
 * bubbles to the window-level listener that the app registered.
 */
async function pressShortcut(page: Page, key: string): Promise<void> {
	await page.locator("body").press(key);
}

// Run tests in this file serially within the worker — they share a
// BroadcastChannel keyed by the worker's unique file name and stomping each
// other's tool state mid-test would be confusing.
//
// Local parallel runs with this spec are racy (the global `keydown` listener
// in use-tool-shortcut.ts is registered by a useEffect that occasionally
// commits AFTER the canvas paints under heavy parallel load on the dev
// server). Allow retries on top of `mode: "serial"` to absorb the residual
// flake; CI already runs `workers: 1` so this is mainly a local-dev quality
// of life setting.
test.describe.configure({ mode: "serial", retries: 2 });

test.describe("pointer tools (laser + pen)", () => {
	test("laser activated on presenter syncs dot to presentation", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		// Presenter focuses its window then presses `l` to enable laser.
		// focus body so window-level keydown listeners receive the key
		await pressShortcut(page, "l");


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

	test("laser activated on presentation syncs dot to presenter", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		// Click presentation body to give it focus, then press `l`.
		// focus body so window-level keydown listeners receive the key
		await pressShortcut(presentation, "l");

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

	test("pen drawing on presenter appears on presentation", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		// focus body so window-level keydown listeners receive the key
		await pressShortcut(page, "d");

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

	test("pen drawing on presentation appears on presenter", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		// focus body so window-level keydown listeners receive the key
		await pressShortcut(presentation, "d");

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

	test("erase clears pen strokes on both windows", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		// Draw on presenter
		// focus body so window-level keydown listeners receive the key
		await pressShortcut(page, "d");
		const c = await getCenterOfCanvas(page);
		await page.mouse.move(c.x - 30, c.y);
		await page.mouse.down();
		await page.mouse.move(c.x + 30, c.y + 20, { steps: 6 });
		await page.mouse.up();

		await expect(penPolylines(page)).toHaveCount(1, { timeout: 5_000 });
		await expect(penPolylines(presentation)).toHaveCount(1, { timeout: 10_000 });

		// Erase
		await pressShortcut(page, "e");

		await expect(penPolylines(page)).toHaveCount(0, { timeout: 5_000 });
		await expect(penPolylines(presentation)).toHaveCount(0, { timeout: 5_000 });

		await presentation.close();
	});

	test("Escape exits tool mode and removes the overlay", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		// focus body so window-level keydown listeners receive the key
		await pressShortcut(page, "l");

		// Overlay portal exists in both windows once tool mode is non-none.
		await expect(pointerOverlayPortal(page)).toBeAttached({ timeout: 5_000 });
		await expect(pointerOverlayPortal(presentation)).toBeAttached({ timeout: 5_000 });

		await pressShortcut(page, "Escape");

		// With no strokes and toolMode back to none, the portal unmounts.
		await expect(pointerOverlayPortal(page)).toHaveCount(0, { timeout: 5_000 });
		await expect(pointerOverlayPortal(presentation)).toHaveCount(0, { timeout: 5_000 });

		await presentation.close();
	});
});
