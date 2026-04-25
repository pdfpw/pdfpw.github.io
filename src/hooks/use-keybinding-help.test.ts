// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useKeybindingHelp } from "./use-keybinding-help.ts";

const HELP_SEEN_KEY = "pdfpw:keybinding-help-seen";

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

	it("? キーで open し、localStorage が更新される", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
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

	it("? を再度押すと close する (toggle)", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
		});
		expect(result.current.isOpen).toBe(true);

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
		});
		expect(result.current.isOpen).toBe(false);
	});

	it("INPUT にフォーカスがあると ? を無視する", () => {
		const { result } = renderHook(() => useKeybindingHelp("presenter"));

		const input = document.createElement("input");
		document.body.appendChild(input);
		input.focus();

		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "?", bubbles: true }),
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

		act(() => {
			result.current.close();
		});
		expect(result.current.isOpen).toBe(false);
	});
});
