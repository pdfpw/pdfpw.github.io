import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/audiance")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/audiance"!</div>;
}
