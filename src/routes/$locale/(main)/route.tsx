import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import Header from "#src/components/Header.tsx";

export const Route = createFileRoute("/$locale/(main)")({
	component: RouteComponent,
});

function RouteComponent() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isPresenterRoute = /^\/(?:en|ja)\/presenter\/?$/.test(pathname);

	return (
		<div className="grid grid-rows-[auto_1fr] h-screen">
			<Header
				onHelpClick={
					isPresenterRoute
						? () => {
								window.dispatchEvent(
									new KeyboardEvent("keydown", { key: "?" }),
								)
							}
						: undefined
				}
			/>
			<Outlet />
		</div>
	)
}
