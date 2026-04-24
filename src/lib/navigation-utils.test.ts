import { describe, expect, it } from "vitest";
import {
	clampPageNumber,
	getNextUserSlidePageNumber,
	getPrevUserSlidePageNumber,
	resolveFirstSlide,
	resolveLastSlide,
	resolveNextPage,
	resolvePrevPage,
} from "./navigation-utils.ts";
import type { ResolvedPdfpcConfigV2 } from "./pdfpc-config.ts";

const makeConfig = (
	pages: number[][],
): Pick<ResolvedPdfpcConfigV2, "pages" | "totalOverlays"> => ({
	pages: pages.map((group) =>
		group.map((pageNumber) => ({
			pageNumber,
			label: String(pageNumber),
			overlay: 0,
			note: "",
		})),
	) as ResolvedPdfpcConfigV2["pages"],
	totalOverlays: pages.flat().length,
});

describe("clampPageNumber", () => {
	it("最小1", () => expect(clampPageNumber(0, 10)).toBe(1));
	it("最大 max", () => expect(clampPageNumber(99, 10)).toBe(10));
	it("範囲内はそのまま", () => expect(clampPageNumber(5, 10)).toBe(5));
});

describe("resolveNextPage", () => {
	it("通常は +1", () => expect(resolveNextPage(5, 10)).toBe(6));
	it("末尾では同値", () => expect(resolveNextPage(10, 10)).toBe(10));
});

describe("resolvePrevPage", () => {
	it("通常は -1", () => expect(resolvePrevPage(5, 10)).toBe(4));
	it("先頭では 1", () => expect(resolvePrevPage(1, 10)).toBe(1));
});

describe("resolveFirstSlide / resolveLastSlide", () => {
	it("first は 1", () => expect(resolveFirstSlide()).toBe(1));
	it("last は totalOverlays", () => expect(resolveLastSlide(10)).toBe(10));
});

describe("getNextUserSlidePageNumber", () => {
	const { pages } = makeConfig([[1, 2], [3], [4, 5, 6]]);
	it("グループ内から次グループ先頭へ", () =>
		expect(getNextUserSlidePageNumber(pages, 1)).toBe(3));
	it("中央からでも次グループ先頭へ", () =>
		expect(getNextUserSlidePageNumber(pages, 2)).toBe(3));
	it("最後のグループでは null", () =>
		expect(getNextUserSlidePageNumber(pages, 5)).toBe(null));
});

describe("getPrevUserSlidePageNumber", () => {
	const { pages } = makeConfig([[1, 2], [3], [4, 5, 6]]);
	it("グループ内から前グループ先頭へ", () =>
		expect(getPrevUserSlidePageNumber(pages, 5)).toBe(3));
	it("最初のグループでは null", () =>
		expect(getPrevUserSlidePageNumber(pages, 1)).toBe(null));
});
