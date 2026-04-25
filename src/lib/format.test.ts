// @vitest-environment jsdom
import {
	type Locale,
	baseLocale,
	overwriteGetLocale,
	overwriteSetLocale,
	setLocale,
} from "#src/paraglide/runtime.js";
import { beforeAll, describe, expect, it } from "vitest";
import { formatDateTime, formatNumber } from "./format.ts";

beforeAll(() => {
	// jsdom の URL 戦略が常に "en" を返すため、テスト用にステートフルな実装で上書きする
	let _locale: Locale = baseLocale;
	overwriteGetLocale(() => _locale);
	overwriteSetLocale((newLocale) => {
		_locale = newLocale;
	});
});

describe("formatDateTime", () => {
	it("locale=en で英語形式の日付を返す", () => {
		setLocale("en", { reload: false });
		const result = formatDateTime(new Date("2026-04-25T10:30:00Z"), {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "UTC",
		});
		expect(result).toMatch(/Apr.*2026/);
	});

	it("locale=ja で日本語形式の日付を返す", () => {
		setLocale("ja", { reload: false });
		const result = formatDateTime(new Date("2026-04-25T10:30:00Z"), {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "UTC",
		});
		expect(result).toMatch(/2026/);
		expect(result).toMatch(/4月|04/);
	});
});

describe("formatNumber", () => {
	it("locale=en で 1,234 形式", () => {
		setLocale("en", { reload: false });
		expect(formatNumber(1234)).toBe("1,234");
	});

	it("locale=ja で 1,234 形式 (日本語も同形式)", () => {
		setLocale("ja", { reload: false });
		expect(formatNumber(1234)).toBe("1,234");
	});
});
