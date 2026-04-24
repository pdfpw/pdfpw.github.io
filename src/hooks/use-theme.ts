import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pdfpw-theme";

function resolveInitialTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "dark" || stored === "light") return stored;
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
