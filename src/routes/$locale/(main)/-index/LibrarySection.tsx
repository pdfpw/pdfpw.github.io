import { CircleHelp, FileClock, FileSymlink, XIcon } from "lucide-react";
import { Button } from "#src/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#src/components/ui/dialog";
import { Skeleton } from "#src/components/ui/skeleton";
import { Switch } from "#src/components/ui/switch";
import { formatDateTime } from "#src/lib/format.ts";
import type { RecentFile, Settings } from "#src/lib/recent-store";
import * as m from "#src/paraglide/messages.js";

type LibrarySectionProps = {
	supportsFSA: boolean;
	recentFiles: RecentFile[];
	settings: Settings;
	onToggleHistory: (value: boolean) => void;
	onClearRecent: () => Promise<void> | void;
	onRecentClick: (item: RecentFile) => Promise<void>;
	onDeleteRecent: (id: string) => Promise<void>;
};

export function LibrarySection({
	supportsFSA,
	recentFiles,
	settings,
	onToggleHistory,
	onClearRecent,
	onRecentClick,
	onDeleteRecent,
}: LibrarySectionProps) {
	return (
		<section className="container mx-auto max-w-6xl px-6 py-14">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						{m.library_eyebrow()}
					</div>
					<div className="text-[11px] text-subtle mt-0.5">
						{recentFiles.length > 0
							? m.library_subtitle_with_count({ count: recentFiles.length })
							: m.library_subtitle_empty()}
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 rounded-md border border-border bg-raised px-3 py-1.5">
						<Switch
							id="save-history"
							checked={settings.saveHistory}
							onCheckedChange={onToggleHistory}
						/>
						<label
							htmlFor="save-history"
							className="text-[11px] font-medium text-muted select-none"
						>
							{m.library_history_toggle()}
						</label>
					</div>
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="ghost" size="icon-sm">
								<CircleHelp className="h-4 w-4" />
								<span className="sr-only">{m.library_help_sr()}</span>
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{m.library_help_title()}</DialogTitle>
								<DialogDescription className="space-y-4 pt-4 text-left">
									<p>
										<strong>{m.library_help_advanced_heading()}</strong>
										<br />
										<span className="flex items-center gap-1">
											<FileSymlink className="h-3 w-3" />
											{m.library_help_advanced_label()}
										</span>
										<br />
										{m.library_help_advanced_body()}
									</p>
									<p>
										<strong>{m.library_help_standard_heading()}</strong>
										<br />
										<span className="flex items-center gap-1">
											<FileClock className="h-3 w-3" />
											{m.library_help_standard_label()}
										</span>
										<br />
										{m.library_help_standard_body()}
									</p>
									<p className="text-xs text-muted">
										{m.library_help_note_overwrite()}
										<br />
										{m.library_help_note_off()}
									</p>
								</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
					{supportsFSA && recentFiles.length > 0 ? (
						<Button
							type="button"
							onClick={onClearRecent}
							variant="ghost"
							size="sm"
						>
							{m.library_clear_all()}
						</Button>
					) : null}
				</div>
			</div>

			{!settings.saveHistory && recentFiles.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-raised/40 p-8 text-center text-[13px] text-muted">
					{m.library_disabled_message()}
				</div>
			) : recentFiles.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-raised/40 p-8 text-center text-[13px] text-muted">
					{m.library_empty_hint()}
				</div>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{recentFiles.map((item) => (
						<li key={item.id}>
							<div className="group relative overflow-hidden rounded-lg border border-border bg-raised transition-colors hover:border-border-strong">
								<button
									type="button"
									onClick={() => void onRecentClick(item)}
									className="block w-full p-2.5 text-left"
									title={
										item.handle
											? m.library_open_latest()
											: m.library_open_snapshot()
									}
								>
									<div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-md bg-gradient-to-br from-surface to-bg">
										<div className="absolute inset-0 flex items-center justify-center text-subtle">
											{item.handle ? (
												<FileSymlink className="size-6" />
											) : (
												<FileClock className="size-6" />
											)}
										</div>
										{item.handle && (
											<span
												role="img"
												aria-label={m.library_fsa_indicator_aria()}
												className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-accent"
											/>
										)}
									</div>
									<div className="truncate text-[12px] font-medium text-fg">
										{item.name}
									</div>
									<div className="mt-0.5 font-mono text-[10px] text-subtle">
										{formatDateTime(item.lastOpened, { dateStyle: "medium", timeStyle: "short" })}
									</div>
								</button>
								<Button
									type="button"
									onClick={() => void onDeleteRecent(item.id)}
									variant="ghost"
									size="icon-sm"
									className="absolute right-1.5 top-1.5 opacity-0 transition hover:text-danger group-hover:opacity-100"
									aria-label={m.library_delete_aria()}
								>
									<XIcon className="size-3.5" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export function LibrarySectionLoading() {
	return (
		<section className="container mx-auto max-w-6xl px-6 py-14">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						{m.library_eyebrow()}
					</div>
					<div className="text-[11px] text-subtle mt-0.5">{m.library_subtitle_empty()}</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 rounded-md border border-border bg-raised px-3 py-1.5">
						<Skeleton className="h-5 w-9 rounded-full" />
						<Skeleton className="h-3 w-16" />
					</div>
					<Button variant="ghost" size="icon-sm" disabled>
						<CircleHelp className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<li
						key={`library-skeleton-${
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
							index
						}`}
					>
						<div className="overflow-hidden rounded-lg border border-border bg-raised p-2.5">
							<Skeleton className="mb-2 aspect-[4/3] w-full rounded-md" />
							<Skeleton className="h-3 w-3/4" />
							<Skeleton className="mt-1 h-2.5 w-1/2" />
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
