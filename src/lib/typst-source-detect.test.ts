import { describe, expect, it } from "vitest";
import {
	containsTypst,
	entriesToTypstSources,
	filesToTypstSources,
	pickMainTypst,
	type TypstSource,
} from "./typst-source-detect";

const src = (path: string): TypstSource => ({ path, data: new Uint8Array() });

describe("containsTypst", () => {
	it("returns true when any file ends with .typ", () => {
		expect(containsTypst([src("main.typ")])).toBe(true);
		expect(containsTypst([src("a.pdf"), src("b.typ")])).toBe(true);
	});
	it("returns false otherwise", () => {
		expect(containsTypst([src("a.pdf")])).toBe(false);
		expect(containsTypst([])).toBe(false);
	});
});

describe("pickMainTypst", () => {
	it("returns the only .typ when single", () => {
		expect(pickMainTypst([src("hello.typ")])).toBe("hello.typ");
	});
	it("prefers main.typ at root when multiple", () => {
		expect(
			pickMainTypst([src("intro.typ"), src("main.typ"), src("appendix.typ")]),
		).toBe("main.typ");
	});
	it("falls back to shallowest then alphabetical when no main.typ", () => {
		expect(
			pickMainTypst([
				src("chapters/01.typ"),
				src("chapters/02.typ"),
				src("zoo.typ"),
				src("alpha.typ"),
			]),
		).toBe("alpha.typ");
	});
	it("returns null when no .typ", () => {
		expect(pickMainTypst([src("a.pdf")])).toBe(null);
	});
});

describe("filesToTypstSources", () => {
	it("uses webkitRelativePath when present, otherwise file name", async () => {
		const a = new File(["hello"], "main.typ", { type: "text/plain" });
		const b = new File([new Uint8Array([1, 2])], "logo.png");
		Object.defineProperty(b, "webkitRelativePath", {
			value: "assets/logo.png",
		});
		const result = await filesToTypstSources([a, b]);
		expect(result.map((r) => r.path)).toEqual(["main.typ", "assets/logo.png"]);
		expect(result[1].data).toEqual(new Uint8Array([1, 2]));
	});
});

describe("entriesToTypstSources", () => {
	it("recursively expands directory entries with relative paths", async () => {
		type MockEntry = {
			isFile: boolean;
			isDirectory: boolean;
			name: string;
			file?: (cb: (f: File) => void) => void;
			createReader?: () => {
				readEntries: (cb: (e: MockEntry[]) => void) => void;
			};
		};
		function fileEntry(name: string, content: string): MockEntry {
			return {
				isFile: true,
				isDirectory: false,
				name,
				file: (cb: (f: File) => void) => cb(new File([content], name)),
			};
		}
		function dirEntry(name: string, children: MockEntry[]): MockEntry {
			return {
				isFile: false,
				isDirectory: true,
				name,
				createReader: () => {
					let exhausted = false;
					return {
						readEntries: (cb: (e: MockEntry[]) => void) => {
							if (exhausted) return cb([]);
							exhausted = true;
							cb(children);
						},
					};
				},
			};
		}
		const root = [
			fileEntry("main.typ", "= Hi"),
			dirEntry("img", [fileEntry("a.png", "x")]),
		];
		const result = await entriesToTypstSources(root);
		expect(result.map((r) => r.path).sort()).toEqual(["img/a.png", "main.typ"]);
	});
});
