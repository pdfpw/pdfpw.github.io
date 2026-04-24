// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation((query: string) => ({
				matches: query === "(prefers-color-scheme: dark)",
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
	});

	it("defaults to 'dark' when no localStorage and OS prefers dark", () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("reads saved theme from localStorage", () => {
		localStorage.setItem("pdfpw-theme", "light");
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("toggles between light and dark", () => {
		const { result } = renderHook(() => useTheme());
		act(() => {
			result.current.toggleTheme();
		});
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(localStorage.getItem("pdfpw-theme")).toBe("light");
	});
});
