// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectInitialLocale } from "./index.tsx";

describe("detectInitialLocale", () => {
	beforeEach(() => {
		localStorage.clear();
	});
	afterEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("localStorage の有効値を最優先する", () => {
		localStorage.setItem("pdfpw:locale", "ja");
		vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
		expect(detectInitialLocale()).toBe("ja");
	});

	it("localStorage が無効値なら navigator.language にフォールバック", () => {
		localStorage.setItem("pdfpw:locale", "fr");
		vi.spyOn(navigator, "language", "get").mockReturnValue("ja-JP");
		expect(detectInitialLocale()).toBe("ja");
	});

	it("navigator.language が ja で始まれば ja", () => {
		vi.spyOn(navigator, "language", "get").mockReturnValue("ja");
		expect(detectInitialLocale()).toBe("ja");
	});

	it("どれにも該当しなければ en", () => {
		vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
		expect(detectInitialLocale()).toBe("en");
	});

	it("localStorage が \"en\" なら navigator.language が ja でも en", () => {
		localStorage.setItem("pdfpw:locale", "en");
		vi.spyOn(navigator, "language", "get").mockReturnValue("ja-JP");
		expect(detectInitialLocale()).toBe("en");
	});
});
