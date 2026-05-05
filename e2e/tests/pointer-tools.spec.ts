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
 * Read the laser dot wrapper's `style.left` / `style.top` (percent strings
 * like "25%", "50%"). These are written directly by `PointerOverlay`
 * (src/components/PointerOverlay.tsx) from `laserPosAtom`, so they are the
 * cleanest signal for "the laser dot is at this normalized position".
 *
 * Returns null when the wrapper isn't present or is hidden.
 */
async function readLaserPercent(page: Page): Promise<{ left: number; top: number } | null> {
	const raw = await page.evaluate(() => {
		const dot = document.querySelector(
			'body > div.fixed.pointer-events-none.z-50 div[style*="width: 0"]',
		) as HTMLElement | null;
		if (!dot) return null;
		if (dot.style.display === "none") return null;
		return { left: dot.style.left, top: dot.style.top };
	});
	if (!raw) return null;
	const parse = (v: string): number | null => {
		const m = v.match(/^(-?\d+(?:\.\d+)?)%$/);
		if (!m) return null;
		const n = Number(m[1]);
		return Number.isNaN(n) ? null : n;
	};
	const left = parse(raw.left);
	const top = parse(raw.top);
	if (left === null || top === null) return null;
	return { left, top };
}

/**
 * Selector for the visible inner core of the laser dot (the 12×12 red
 * circle, last child of the 0×0 LaserDot wrapper). We probe THIS element
 * for visibility instead of the wrapper because the wrapper has inline
 * `width: 0; height: 0` and would always be reported as zero-area
 * regardless of whether the actual dot is shown.
 */
function laserCore(page: Page) {
	return page
		.locator(
			'body > div.fixed.pointer-events-none.z-50 div[style*="width: 0"] > div:last-child',
		)
		.first();
}

/**
 * Verify the laser dot is actually visible to the user at `expected`:
 *
 * 1. The inner red core passes Playwright's `toBeVisible()` — which is
 *    stricter than DOM `Element.checkVisibility()`: it requires
 *    display ≠ none, visibility ≠ hidden, opacity > 0 anywhere up the
 *    chain, AND bounding-box area > 0. Catches the "laser is in DOM but
 *    invisible" failure modes that `checkVisibility()` alone misses
 *    (opacity:0 ancestor, visibility:hidden, 0×0 size).
 * 2. The wrapper's inline percent matches `expected` — proves the dot is
 *    where the cursor pointed, not lingering at a stale position.
 * 3. At the dot's pixel center, no other element is stacked in front of
 *    the overlay. Chromium's `document.elementsFromPoint()` filters out
 *    `pointer-events: none` elements, so we flip the overlay's inline
 *    pointer-events to `auto` for the probe and restore it. Catches
 *    z-index / stacking regressions where the laser sits behind the
 *    slide.
 */
async function expectLaserVisibleAt(
	page: Page,
	expected: { left: number; top: number },
	tolerance = 2,
): Promise<void> {
	// (1) Visible to the user.
	await expect(laserCore(page)).toBeVisible({ timeout: 10_000 });
	// (2) At the expected position.
	await expect
		.poll(
			async () => {
				const pos = await readLaserPercent(page);
				if (!pos) return false;
				return (
					Math.abs(pos.left - expected.left) <= tolerance &&
					Math.abs(pos.top - expected.top) <= tolerance
				);
			},
			{ timeout: 10_000 },
		)
		.toBe(true);
	// (3) Not occluded by anything stacked in front.
	await expect
		.poll(
			async () =>
				page.evaluate(
					({ leftPct, topPct }) => {
						const overlay = document.querySelector(
							"body > div.fixed.pointer-events-none.z-50",
						) as HTMLElement | null;
						if (!overlay) return false;
						const overlayRect = overlay.getBoundingClientRect();
						const cx =
							overlayRect.left + (overlayRect.width * leftPct) / 100;
						const cy =
							overlayRect.top + (overlayRect.height * topPct) / 100;
						const prevPE = overlay.style.pointerEvents;
						overlay.style.pointerEvents = "auto";
						try {
							const stack = document.elementsFromPoint(cx, cy);
							if (stack.length === 0) return false;
							const top = stack[0];
							return top === overlay || overlay.contains(top);
						} finally {
							overlay.style.pointerEvents = prevPE;
						}
					},
					{ leftPct: expected.left, topPct: expected.top },
				),
			{ timeout: 10_000 },
		)
		.toBe(true);
}

async function expectLaserNear(
	page: Page,
	expected: { left: number; top: number },
	tolerance = 2,
): Promise<void> {
	await expect
		.poll(
			async () => {
				const pos = await readLaserPercent(page);
				if (!pos) return false;
				return (
					Math.abs(pos.left - expected.left) <= tolerance &&
					Math.abs(pos.top - expected.top) <= tolerance
				);
			},
			{ timeout: 10_000 },
		)
		.toBe(true);
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

	test("laser dot tracks mouse position across presenter and presentation", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		await pressShortcut(page, "l");

		const box = await page.locator("canvas").first().boundingBox();
		if (!box) throw new Error("canvas not found");

		// Move to ~25% of canvas (top-left quadrant). PointerOverlay sets
		// `style.left = ${pos.x * 100}%`, so the dot's percent should match
		// the cursor's normalized canvas position.
		await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
		await expectLaserNear(page, { left: 25, top: 25 });
		// Broadcast pushes the same position to the presentation.
		await expectLaserNear(presentation, { left: 25, top: 25 });

		// Move to ~75% (bottom-right quadrant) and verify the dot has moved
		// the full delta, not lingering at the previous spot.
		await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
		await expectLaserNear(page, { left: 75, top: 75 });
		await expectLaserNear(presentation, { left: 75, top: 75 });

		// One more move to a non-symmetric point so x and y diverge — catches
		// any accidental coordinate swap or shared-axis bug.
		await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.9);
		await expectLaserNear(page, { left: 10, top: 90 });
		await expectLaserNear(presentation, { left: 10, top: 90 });

		await presentation.close();
	});

	test("laser dot stays on top of the slide across the canvas (grid of 9 points)", async ({ page, context, uniqueFixtures }) => {
		const presentation = await uploadAndCapture(page, context, uniqueFixtures);

		await pressShortcut(page, "l");

		const box = await page.locator("canvas").first().boundingBox();
		if (!box) throw new Error("canvas not found");

		// 3×3 grid covering the slide. The dot must be both rendered
		// (`checkVisibility`) AND the topmost element at its pixel center
		// (no z-index regression hiding it behind the slide). Verified on
		// presenter and presentation independently — a stacking bug on
		// either side is its own concern.
		const gridPoints: ReadonlyArray<{ left: number; top: number }> = [
			{ left: 10, top: 10 },
			{ left: 50, top: 10 },
			{ left: 90, top: 10 },
			{ left: 10, top: 50 },
			{ left: 50, top: 50 },
			{ left: 90, top: 50 },
			{ left: 10, top: 90 },
			{ left: 50, top: 90 },
			{ left: 90, top: 90 },
		];

		for (const p of gridPoints) {
			await page.mouse.move(
				box.x + box.width * (p.left / 100),
				box.y + box.height * (p.top / 100),
			);
			await expectLaserVisibleAt(page, p);
			await expectLaserVisibleAt(presentation, p);
		}

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
