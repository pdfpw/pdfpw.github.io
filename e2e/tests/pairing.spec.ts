import { test, expect } from "../helpers/test-fixtures";
import { resetAppState } from "../helpers/reset-state";

/**
 * Verify the full presenter ↔ presentation pairing flow end-to-end.
 *
 * Pairing is the act of getting both windows onto the same BroadcastChannel:
 *
 * 1. `proceedWithPdf` calls `ensurePresenterPairId(pdf.name)` to seed
 *    `sessionStorage["pdfpw:pairId:<file>"]` BEFORE `window.open(...)`.
 * 2. The popup snapshots the opener's sessionStorage at creation time, so it
 *    inherits the same pair-id without needing to fall through to the lobby.
 * 3. With matching pair-ids, presenter and presentation join the same channel
 *    `pdfpw:<file>:<pair-id>`. The presentation sends `initialize`; the
 *    presenter responds with `initialize-response` carrying pdfpcConfig +
 *    pdfData; the presentation mounts `<PresentationView>` (canvas appears).
 *
 * If any of the above breaks, the presentation is stuck in the "Connecting…"
 * placeholder, falls back to the lobby and times out
 * (`TIMEOUT_PAIRING_PRESENTATION`), or shows the error boundary fallback.
 *
 * Other specs implicitly rely on pairing succeeding (sync, pointer-tools)
 * but only via the canvas-visible signal mid-test. This spec asserts
 * pairing as the primary subject so regressions surface here directly.
 */

const PAIR_ID_KEY = (file: string) => `pdfpw:pairId:${file}`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe("presenter ↔ presentation pairing", () => {
	test("file open seeds pair-id and the popup pairs successfully", async ({ page, context, uniqueFixtures }) => {
		await resetAppState(page);

		const presentationPromise = context.waitForEvent("page");
		await page
			.locator('input[type="file"][accept*=".pdf"]')
			.setInputFiles([uniqueFixtures.pdf, uniqueFixtures.pdfpc]);
		await page.waitForURL(/\/(en|ja)\/presenter/, { timeout: 15_000 });

		const presentation = await presentationPromise;
		await presentation.waitForLoadState("domcontentloaded");

		// Presenter must have written a UUID pair-id to sessionStorage before
		// opening the popup. Without this, the popup falls back to lobby
		// pairing and can time out.
		const presenterPairId = await page.evaluate(
			(key) => sessionStorage.getItem(key),
			PAIR_ID_KEY(uniqueFixtures.pdfName),
		);
		expect(presenterPairId).toMatch(UUID_RE);

		// Presentation canvas mounts only after `initialize-response` arrives,
		// which proves the channel pair worked end-to-end.
		await presentation
			.locator("canvas")
			.first()
			.waitFor({ state: "visible", timeout: 30_000 });

		// And the presentation must NOT be in any of the failure states.
		await expect(presentation.getByText(/Connecting…|接続中…/)).toBeHidden();
		await expect(presentation.getByText(/Pairing failed|ペアリングに失敗/)).toBeHidden();
		await expect(
			presentation.getByText(/Could not load the configuration|設定を読み込めません/),
		).toBeHidden();
		await expect(
			presentation.getByText(/Could not load the PDF file|PDF ファイルの読み込みに失敗/),
		).toBeHidden();

		// The popup inherited the SAME pair-id. If this fails, the popup
		// snapshotted sessionStorage before the seed (regression of the
		// fix in src/routes/$locale/(main)/index.tsx).
		const presentationPairId = await presentation.evaluate(
			(key) => sessionStorage.getItem(key),
			PAIR_ID_KEY(uniqueFixtures.pdfName),
		);
		expect(presentationPairId).toBe(presenterPairId);

		await presentation.close();
	});
});
