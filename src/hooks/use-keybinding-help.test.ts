// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HELP_SEEN_KEY, useKeybindingHelp } from "./use-keybinding-help.ts";

describe("useKeybindingHelp", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("初期状態は閉じていて、まだヒントは見ていない", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));
		expect(result.current.isOpen).toBe(false);
		expect(result.current.shouldShowHint).toBe(true);
	});

	it("Shift+? キーで open し、localStorage が更新される", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			);
		});

		expect(result.current.isOpen).toBe(true);
		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');
	});

	it("F1 キーでも open する", () => {
		const { result } = renderHook(() => useKeybindingHelp("presentation"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});

		expect(result.current.isOpen).toBe(true);
	});

	it("Shift+? を再度押すと close する (toggle)", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			);
		});
		expect(result.current.isOpen).toBe(true);

		act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			);
		});
		expect(result.current.isOpen).toBe(false);
	});

	it("F1 は idempotent open (押しても close しない)", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});
		expect(result.current.isOpen).toBe(true);

		// 既に open 状態で F1 を再度押しても close しない
		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
		});
		expect(result.current.isOpen).toBe(true);
	});

	it("INPUT にフォーカスがあると Shift+? を無視する", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		const input = document.createElement("input");
		document.body.appendChild(input);
		input.focus();

		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "?",
					shiftKey: true,
					bubbles: true,
				}),
			);
		});

		expect(result.current.isOpen).toBe(false);
		document.body.removeChild(input);
	});

	it("dismissHint() で shouldShowHint が false になる", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));
		expect(result.current.shouldShowHint).toBe(true);

		act(() => {
			result.current.dismissHint();
		});

		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');
	});

	it("open() / close() メソッドで明示的に開閉できる", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			result.current.open();
		});
		expect(result.current.isOpen).toBe(true);
		expect(result.current.shouldShowHint).toBe(false);
		expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('"1"');

		act(() => {
			result.current.close();
		});
		expect(result.current.isOpen).toBe(false);
	});
});
