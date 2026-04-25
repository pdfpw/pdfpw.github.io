import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { type Locale, isLocale, setLocale } from "#src/paraglide/runtime.js";

export const Route = createFileRoute("/$locale")({
	beforeLoad: ({ params, location }) => {
		if (!isLocale(params.locale)) {
			// 元の pathname から invalid locale segment を剥がし、en で再構築
			const segments = location.pathname.split("/").filter(Boolean);
			segments.shift(); // invalid locale を除去
			const restPath = segments.join("/");
			throw redirect({
				href: restPath ? `/en/${restPath}` : "/en",
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
		if (typeof document !== "undefined") {
			document.documentElement.lang = locale;
		}
	}, [locale]);

	return <Outlet />;
}
