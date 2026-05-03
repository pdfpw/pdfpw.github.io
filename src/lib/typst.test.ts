import { describe, expect, it } from "vitest";
import { compileTypst } from "./typst";

const enc = (s: string) => new TextEncoder().encode(s);

describe("compileTypst", () => {
	it("compiles a minimal .typ to a PDF", async () => {
		const res = await compileTypst({
			sources: [{ path: "main.typ", data: enc("= Hello\nWorld") }],
			mainPath: "main.typ",
		});
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.pdf.length).toBeGreaterThan(100);
			expect(new TextDecoder().decode(res.pdf.slice(0, 5))).toBe("%PDF-");
		}
	}, 60_000);

	it("returns diagnostics on syntax error", async () => {
		const res = await compileTypst({
			sources: [{ path: "main.typ", data: enc("#let x = (\n") }],
			mainPath: "main.typ",
		});
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.diagnostics.length).toBeGreaterThan(0);
			expect(res.diagnostics[0].severity).toBe("error");
		}
	}, 60_000);

	it("emits loading-wasm progress before compiling", async () => {
		const stages: string[] = [];
		await compileTypst(
			{
				sources: [{ path: "main.typ", data: enc("= Hi") }],
				mainPath: "main.typ",
			},
			{ onProgress: (p) => stages.push(p.stage) },
		);
		expect(stages[0]).toBe("loading-wasm");
		expect(stages).toContain("compiling");
	}, 60_000);
});
