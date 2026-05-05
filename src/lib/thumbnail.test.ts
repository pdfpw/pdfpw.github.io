import { afterEach, describe, expect, it, vi } from "vitest";
import demoPdfUrl from "../../demo/pdfpw-demo.pdf?url";
import { generateThumbnail } from "./thumbnail.ts";

async function loadDemoPdfFile(): Promise<File> {
	const res = await fetch(demoPdfUrl);
	const blob = await res.blob();
	return new File([blob], "pdfpw-demo.pdf", { type: "application/pdf" });
}

describe("generateThumbnail", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns a JPEG data URL for a real PDF", async () => {
		const file = await loadDemoPdfFile();
		const result = await generateThumbnail(file);
		expect(result).toMatch(/^data:image\/jpeg;base64,/);
		// A rendered page produces a non-trivial JPEG (>1 KB encoded).
		expect((result ?? "").length).toBeGreaterThan(1000);
	});

	it("returns null for a corrupted PDF", async () => {
		const broken = new File([new Uint8Array([0, 0, 0, 0])], "broken.pdf", {
			type: "application/pdf",
		});
		const result = await generateThumbnail(broken);
		expect(result).toBeNull();
	});

	it("returns null when canvas getContext returns null", async () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			// biome-ignore lint/suspicious/noExplicitAny: forcing the failure branch
			null as any,
		);
		const file = await loadDemoPdfFile();
		const result = await generateThumbnail(file);
		expect(result).toBeNull();
	});
});
