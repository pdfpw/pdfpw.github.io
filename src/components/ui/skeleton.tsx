import type { ClassValue } from "clsx";
import { cn } from "#src/lib/utils";

function Skeleton({
	className,
	...props
}: Omit<React.ComponentProps<"div">, "className"> & {
	className?: ClassValue;
}) {
	return (
		<div
			data-slot="skeleton"
			className={cn("bg-accent animate-pulse rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
