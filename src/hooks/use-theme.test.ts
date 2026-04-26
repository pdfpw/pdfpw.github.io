import { act } from "react";
import { renderHook } from "vitest-browser-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

function stubMatchMedia(prefersDark: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches:
				query === "(prefers-color-scheme: dark)" ? prefersDark : !prefersDark,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

describe("useTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		stubMatchMedia(true);
	});

	it("defaults to 'dark' when no localStorage and OS prefers dark", () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("defaults to 'light' when no localStorage and OS prefers light", () => {
		stubMatchMedia(false);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("reads saved theme from localStorage", () => {
		localStorage.setItem("pdfpw-theme", "light");
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("toggles between light and dark", async () => {
		const { result } = renderHook(() => useTheme());
		await act(() => {
			result.current.toggleTheme();
		});
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(localStorage.getItem("pdfpw-theme")).toBe("light");
	});

	it("syncs theme across windows via storage event", async () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe("dark");
		await act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "pdfpw-theme",
					newValue: "light",
				}),
			);
		});
		expect(result.current.theme).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("ignores storage events with unrelated keys", async () => {
		const { result } = renderHook(() => useTheme());
		await act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "unrelated",
					newValue: "light",
				}),
			);
		});
		expect(result.current.theme).toBe("dark");
	});
});
