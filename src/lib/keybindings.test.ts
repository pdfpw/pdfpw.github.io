// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	humanizeKey,
	KEYBINDING_CATALOG,
	matchAction,
	matchBinding,
} from "./keybindings.ts";

const makeEvent = (init: Partial<KeyboardEvent>): KeyboardEvent =>
	new KeyboardEvent("keydown", {
		key: init.key,
		shiftKey: init.shiftKey ?? false,
		ctrlKey: init.ctrlKey ?? false,
		altKey: init.altKey ?? false,
		metaKey: init.metaKey ?? false,
	});

describe("matchBinding", () => {
	it("単一文字は大文字小文字を問わずマッチ", () => {
		expect(matchBinding(makeEvent({ key: "L" }), { key: "l" })).toBe(true);
		expect(matchBinding(makeEvent({ key: "l" }), { key: "l" })).toBe(true);
	});

	it("特殊キー名は完全一致のみ", () => {
		expect(
			matchBinding(makeEvent({ key: "ArrowRight" }), { key: "ArrowRight" }),
		).toBe(true);
		expect(
			matchBinding(makeEvent({ key: "Right" }), { key: "ArrowRight" }),
		).toBe(false);
	});

	it("修飾キーは完全一致 (shift 必須)", () => {
		expect(
			matchBinding(makeEvent({ key: "ArrowRight", shiftKey: true }), {
				key: "ArrowRight",
				shift: true,
			}),
		).toBe(true);
		// shift なしで shift 必須バインディングは不一致
		expect(
			matchBinding(makeEvent({ key: "ArrowRight" }), {
				key: "ArrowRight",
				shift: true,
			}),
		).toBe(false);
		// shift あり + shift 不要バインディングも不一致
		expect(
			matchBinding(makeEvent({ key: "ArrowRight", shiftKey: true }), {
				key: "ArrowRight",
			}),
		).toBe(false);
	});

	it("ctrl / alt / meta も完全一致", () => {
		expect(
			matchBinding(makeEvent({ key: "a", ctrlKey: true }), { key: "a" }),
		).toBe(false);
		expect(
			matchBinding(makeEvent({ key: "a", ctrlKey: true }), {
				key: "a",
				ctrl: true,
			}),
		).toBe(true);
	});
});

describe("matchAction", () => {
	it("scope=presenter で presenter 限定キー (r) がマッチ", () => {
		const action = matchAction(makeEvent({ key: "r" }), "presenter");
		expect(action).toBe("system.reset-timer");
	});

	it("scope=presentation で presenter 限定キー (r) は null", () => {
		const action = matchAction(makeEvent({ key: "r" }), "presentation");
		expect(action).toBeNull();
	});

	it("scope=presentation で presentation 限定キー (f) がマッチ", () => {
		const action = matchAction(makeEvent({ key: "f" }), "presentation");
		expect(action).toBe("view.fullscreen");
	});

	it("両画面共通キー (l) は両 scope でマッチ", () => {
		expect(matchAction(makeEvent({ key: "l" }), "presenter")).toBe(
			"tool.laser",
		);
		expect(matchAction(makeEvent({ key: "l" }), "presentation")).toBe(
			"tool.laser",
		);
	});

	it("Shift+ArrowRight は slide.next-10、ArrowRight は slide.next", () => {
		expect(matchAction(makeEvent({ key: "ArrowRight" }), "presenter")).toBe(
			"slide.next",
		);
		expect(
			matchAction(
				makeEvent({ key: "ArrowRight", shiftKey: true }),
				"presenter",
			),
		).toBe("slide.next-10");
	});

	it("Shift+? と F1 は system.help にマッチ", () => {
		expect(
			matchAction(makeEvent({ key: "?", shiftKey: true }), "presenter"),
		).toBe("system.help");
		expect(matchAction(makeEvent({ key: "F1" }), "presentation")).toBe(
			"system.help",
		);
	});

	it("Shift なしの ? は system.help にマッチしない (実ブラウザでは ? は常に Shift+/ で生成される)", () => {
		expect(matchAction(makeEvent({ key: "?" }), "presenter")).toBeNull();
	});

	it("未定義キーは null", () => {
		expect(matchAction(makeEvent({ key: "z" }), "presenter")).toBeNull();
	});
});

describe("KEYBINDING_CATALOG", () => {
	it("全 action に bindings が1件以上ある", () => {
		for (const [actionId, def] of Object.entries(KEYBINDING_CATALOG)) {
			expect(def.bindings.length, `${actionId} has bindings`).toBeGreaterThan(
				0,
			);
		}
	});
});

describe("humanizeKey", () => {
	it("特殊キーを記号化", () => {
		expect(humanizeKey("ArrowRight")).toBe("→");
		expect(humanizeKey("ArrowLeft")).toBe("←");
		expect(humanizeKey("ArrowUp")).toBe("↑");
		expect(humanizeKey("ArrowDown")).toBe("↓");
		expect(humanizeKey(" ")).toBe("Space");
		expect(humanizeKey("PageDown")).toBe("PgDn");
		expect(humanizeKey("PageUp")).toBe("PgUp");
		expect(humanizeKey("Escape")).toBe("Esc");
	});

	it("単一文字は大文字化", () => {
		expect(humanizeKey("l")).toBe("L");
		expect(humanizeKey("?")).toBe("?");
	});

	it("未知のキーはそのまま", () => {
		expect(humanizeKey("F1")).toBe("F1");
		expect(humanizeKey("Home")).toBe("Home");
	});
});
