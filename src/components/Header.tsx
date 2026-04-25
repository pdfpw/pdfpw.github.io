import { Link, useParams } from "@tanstack/react-router";
import { FileTextIcon, KeyboardIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

function GithubMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			className={className}
		>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	);
}

interface HeaderProps {
	onHelpClick?: () => void;
}

export default function Header({ onHelpClick }: HeaderProps = {}) {
	const params = useParams({ strict: false }) as { locale?: string };
	const safeLocale = params.locale === "ja" || params.locale === "en" ? params.locale : "en";

	return (
		<header className="flex items-center justify-between border-b border-border bg-bg px-6 py-3">
			<Link
				to="/$locale"
				params={{ locale: safeLocale }}
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
				{onHelpClick && (
					<button
						type="button"
						onClick={onHelpClick}
						className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
						aria-label="Keyboard shortcuts"
					>
						<KeyboardIcon className="size-4" />
					</button>
				)}
				<a
					href="https://github.com/pdfpw/pdfpw.github.io"
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
					aria-label="GitHub"
				>
					<GithubMark className="size-4" />
				</a>
				<Link
					to="/$locale/licenses"
					params={{ locale: safeLocale }}
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
