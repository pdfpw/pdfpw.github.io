import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/speaker")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/speaker"!</div>;
}
