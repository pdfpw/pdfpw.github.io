import LICENSES, { type License } from "virtual:licenses-info";
import { createFileRoute } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card.tsx";

export const Route = createFileRoute("/(main)/licenses")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex justify-center p-4">
			<div className="grid gap-4 max-w-6xl">
				{Object.values(LICENSES)
					.flat()
					.map((license) => (
						<LicenseCard key={license.name} license={license} />
					))}
			</div>
		</div>
	);
}

function LicenseCard({ license }: { license: License }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{license.name}</CardTitle>
				<CardDescription>
					License: {license.license}
					{license.author && <> | Author: {license.author}</>}
				</CardDescription>
			</CardHeader>
			<CardContent className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-justify">
				{license.licenseText}
			</CardContent>
		</Card>
	);
}
