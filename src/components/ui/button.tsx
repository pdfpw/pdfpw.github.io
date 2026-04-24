import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-2 aria-invalid:ring-danger/40 aria-invalid:border-danger",
	{
		variants: {
			variant: {
				default:
					"bg-accent text-accent-fg hover:bg-accent-hi active:bg-accent-lo",
				destructive:
					"bg-danger text-white hover:bg-danger/90",
				outline:
					"border border-border-strong bg-transparent text-fg hover:bg-surface",
				secondary:
					"bg-surface text-fg border border-border hover:bg-raised",
				ghost:
					"bg-transparent text-muted hover:bg-surface hover:text-fg",
				"accent-ghost":
					"bg-transparent text-accent border border-accent-soft hover:bg-accent-soft",
				link: "text-accent underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5 text-[13px]",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
