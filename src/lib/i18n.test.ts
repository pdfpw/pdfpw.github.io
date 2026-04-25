// @vitest-environment node
import { describe, expect, it } from "vitest";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";

const META_KEYS = new Set(["$schema"]);

function payloadKeys(json: Record<string, unknown>): string[] {
	return Object.keys(json)
		.filter((k) => !META_KEYS.has(k))
		.sort();
}

describe("messages catalog integrity", () => {
	it("en と ja で同一のキー集合を持つ", () => {
		const enKeys = payloadKeys(enMessages as Record<string, unknown>);
		const jaKeys = payloadKeys(jaMessages as Record<string, unknown>);
		expect(jaKeys).toEqual(enKeys);
	});

	it("値は全て non-empty な string", () => {
		for (const json of [enMessages, jaMessages] as const) {
			for (const [k, v] of Object.entries(json)) {
				if (META_KEYS.has(k)) continue;
				expect(typeof v, `${k} should be string`).toBe("string");
				if (k !== "kb_hint_prefix") {
					// kb_hint_prefix は ja で空になる場合があるので除外
					expect((v as string).length, `${k} should be non-empty`).toBeGreaterThan(
						0,
					);
				}
			}
		}
	});
});
