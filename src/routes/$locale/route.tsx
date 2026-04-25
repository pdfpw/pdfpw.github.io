import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { type Locale, isLocale, setLocale } from "#src/paraglide/runtime.js";

export const Route = createFileRoute("/$locale")({
	beforeLoad: ({ params }) => {
		if (!isLocale(params.locale)) {
			throw redirect({
				to: "/$locale",
				params: { locale: "en" },
				replace: true,
			});
		}
	},
	component: LocaleLayout,
});

function LocaleLayout() {
	const { locale } = Route.useParams();

	useEffect(() => {
		setLocale(locale as Locale, { reload: false });
	}, [locale]);

	if (typeof document !== "undefined") {
		document.documentElement.lang = locale;
	}

	return <Outlet />;
}
