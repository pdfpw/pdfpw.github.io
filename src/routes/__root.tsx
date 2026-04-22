import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import UpdateToast from "../components/UpdateToast";

function RootLayout() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const showToast = !pathname.startsWith("/presentation");
	return (
		<>
			<Outlet />
			{showToast && <UpdateToast />}
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
		</>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
