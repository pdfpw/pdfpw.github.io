import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

export const fixtures = {
	pdf: path.join(repoRoot, "demo", "pdfpw-demo.pdf"),
	pdfpc: path.join(repoRoot, "demo", "pdfpw-demo.pdfpc"),
} as const;
