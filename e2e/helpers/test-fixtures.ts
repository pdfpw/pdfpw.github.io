import { test as base } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const sourcePdf = path.join(repoRoot, "demo", "pdfpw-demo.pdf");
const sourcePdfpc = path.join(repoRoot, "demo", "pdfpw-demo.pdfpc");

interface UniqueFixtures {
	/** Unique PDF basename (e.g. `pdfpw-demo-w0.pdf`) — what File.name resolves to. */
	pdfName: string;
	/** Unique pdfpc basename. */
	pdfpcName: string;
	/** Absolute path to the worker-local PDF copy. */
	pdf: string;
	/** Absolute path to the worker-local pdfpc copy. */
	pdfpc: string;
}

/**
 * Each worker gets its own copy of the demo PDF + pdfpc with unique basenames
 * (e.g. `pdfpw-demo-w0.pdf`). The app keys its BroadcastChannel name and
 * sessionStorage pair-id on `File.name`, so unique names per worker prevent
 * cross-talk between parallel test workers running against the same dev
 * server. Without this isolation, a presenter in worker A could end up paired
 * with a presentation in worker B because both opened the same fileName.
 *
 * The .pdfpc basename must share the .pdf's stem (e.g. `pdfpw-demo-w0`), since
 * `proceedWithPdf` only treats them as a pair when their stems match.
 */
export const test = base.extend<{ uniqueFixtures: UniqueFixtures }, { _workerFixtures: UniqueFixtures }>(
	{
		_workerFixtures: [
			async ({}, use, workerInfo) => {
				const id = `w${workerInfo.workerIndex}`;
				const stem = `pdfpw-demo-${id}`;
				const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `pdfpw-e2e-${id}-`));
				const pdfPath = path.join(tempDir, `${stem}.pdf`);
				const pdfpcPath = path.join(tempDir, `${stem}.pdfpc`);
				await fs.copyFile(sourcePdf, pdfPath);
				await fs.copyFile(sourcePdfpc, pdfpcPath);

				await use({
					pdfName: `${stem}.pdf`,
					pdfpcName: `${stem}.pdfpc`,
					pdf: pdfPath,
					pdfpc: pdfpcPath,
				});

				await fs.rm(tempDir, { recursive: true, force: true });
			},
			{ scope: "worker" },
		],

		uniqueFixtures: async ({ _workerFixtures }, use) => {
			await use(_workerFixtures);
		},
	},
);

export { expect } from "@playwright/test";
