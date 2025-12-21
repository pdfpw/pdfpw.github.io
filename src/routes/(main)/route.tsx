import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "#src/components/Header.tsx";

export const Route = createFileRoute("/(main)")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="grid grid-rows-[auto_1fr] h-screen">
			<Header />
			<Outlet />
		</div>
	);
}
