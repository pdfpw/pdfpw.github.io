import type * as React from "react";
import { cn } from "#src/lib/utils.ts";

export function Kbd({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	return (
		<kbd
			className={cn(
				"inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border bg-raised px-1.5 py-0.5 font-mono text-[12px] font-medium text-fg leading-none shadow-[0_1px_0_rgba(0,0,0,0.4)]",
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
}
