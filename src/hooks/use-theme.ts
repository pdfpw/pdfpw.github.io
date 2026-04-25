import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pdfpw-theme";

function readStoredTheme(): Theme | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		return stored === "dark" || stored === "light" ? stored : null;
	} catch {
		return null;
	}
}

function resolveInitialTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	const stored = readStoredTheme();
	if (stored !== null) return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Track OS preference changes when the user has no explicit choice.
	useEffect(() => {
		if (readStoredTheme() !== null) return;
		const mql = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (event: MediaQueryListEvent) => {
			setThemeState(event.matches ? "dark" : "light");
		};
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	// Sync between presenter / presentation windows via storage event.
	useEffect(() => {
		const handler = (event: StorageEvent) => {
			if (event.key !== STORAGE_KEY) return;
			if (event.newValue === "dark" || event.newValue === "light") {
				setThemeState(event.newValue);
			}
		};
		window.addEventListener("storage", handler);
		return () => window.removeEventListener("storage", handler);
	}, []);

	const setTheme = useCallback((next: Theme) => {
		window.localStorage.setItem(STORAGE_KEY, next);
		setThemeState(next);
	}, []);

	const toggleTheme = useCallback(() => {
		setThemeState((current) => {
			const next: Theme = current === "dark" ? "light" : "dark";
			window.localStorage.setItem(STORAGE_KEY, next);
			return next;
		});
	}, []);

	return { theme, setTheme, toggleTheme } as const;
}
