import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { cn } from "#src/lib/utils.ts";

const LOCALES = [
	{ code: "en", short: "EN", name: "English" },
	{ code: "ja", short: "JA", name: "日本語" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

const LOCALE_STORAGE_KEY = "pdfpw:locale";

function rewritePath(pathname: string, nextLocale: LocaleCode): string {
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length === 0) return `/${nextLocale}`;
	if (segments[0] === "en" || segments[0] === "ja") {
		segments[0] = nextLocale;
	} else {
		segments.unshift(nextLocale);
	}
	return `/${segments.join("/")}`;
}

export function LocaleSwitcher() {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams({ strict: false }) as { locale?: string };
	const current: LocaleCode = params.locale === "ja" ? "ja" : "en";

	function switchTo(next: LocaleCode) {
		if (next === current) return;
		try {
			localStorage.setItem(LOCALE_STORAGE_KEY, next);
		} catch {
			// localStorage 利用不可環境では握り潰し
		}
		const nextPath = rewritePath(location.pathname, next);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		void navigate({ to: nextPath as any, replace: true });
	}

	return (
		<fieldset
			aria-label="Switch language"
			className="inline-flex items-center rounded-md border border-border bg-bg p-0.5"
		>
			{LOCALES.map((l) => {
				const active = l.code === current;
				return (
					<button
						key={l.code}
						type="button"
						onClick={() => switchTo(l.code)}
						aria-pressed={active}
						aria-label={l.name}
						className={cn(
							"inline-flex h-7 min-w-[28px] items-center justify-center rounded-sm px-2 font-mono text-[10px] font-semibold transition-colors",
							active
								? "bg-accent-soft text-accent"
								: "text-muted hover:bg-surface hover:text-fg",
						)}
					>
						{l.short}
					</button>
				);
			})}
		</fieldset>
	);
}
