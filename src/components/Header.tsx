import { Link } from "@tanstack/react-router";
import { FileTextIcon, GithubIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
	return (
		<header className="flex items-center justify-between border-b border-border bg-bg px-6 py-3">
			<Link
				to="/"
				className="flex items-center gap-2 text-fg transition-opacity hover:opacity-80"
			>
				<span
					aria-hidden
					className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-accent text-accent-fg text-[11px] font-semibold"
				>
					+
				</span>
				<span className="text-[13px] font-semibold tracking-tight">pdfpw</span>
			</Link>

			<div className="flex items-center gap-1">
				<a
					href="https://github.com/pdfpw/pdfpw.github.io"
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
					aria-label="GitHub"
				>
					<GithubIcon className="size-4" />
				</a>
				<Link
					to="/licenses"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
					aria-label="Licenses"
				>
					<FileTextIcon className="size-4" />
				</Link>
				<ThemeToggle />
			</div>
		</header>
	);
}
