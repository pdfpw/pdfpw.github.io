import { createFileRoute, Navigate } from "@tanstack/react-router";

export type Locale = "en" | "ja";

export function detectInitialLocale(): Locale {
	try {
		const stored = localStorage.getItem("pdfpw:locale");
		if (stored === "en" || stored === "ja") return stored;
	} catch {
		// localStorage が利用不可な環境では無視
	}
	const lang = typeof navigator !== "undefined" ? navigator.language : "";
	return lang.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export const Route = createFileRoute("/")({
	component: RootRedirect,
});

function RootRedirect() {
	const locale = detectInitialLocale();
	return <Navigate to="/$locale" params={{ locale }} replace />;
}
