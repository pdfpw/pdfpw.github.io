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
import type { RecentFile, Settings } from "#src/lib/recent-store";

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
						LIBRARY
					</div>
					<div className="text-[11px] text-subtle mt-0.5">
						{recentFiles.length > 0
							? `${recentFiles.length} files · recent first`
							: "recent first"}
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
							履歴を保存
						</label>
					</div>
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="ghost" size="icon-sm">
								<CircleHelp className="h-4 w-4" />
								<span className="sr-only">ヘルプ</span>
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>履歴の保存について</DialogTitle>
								<DialogDescription className="space-y-4 pt-4 text-left">
									<p>
										<strong>高機能モード (推奨)</strong>
										<br />
										<span className="flex items-center gap-1">
											<FileSymlink className="h-3 w-3" />
											ファイルへのリンク
										</span>
										<br />
										ファイルへのポインタのみを保存するため、常に最新のファイルを開くことができます。
									</p>
									<p>
										<strong>標準モード</strong>
										<br />
										<span className="flex items-center gap-1">
											<FileClock className="h-3 w-3" />
											スナップショット保存
										</span>
										<br />
										その時点のファイルそのものをブラウザ内に保存します。元のファイルを更新しても、履歴から開く際は保存時の状態となります。
									</p>
									<p className="text-xs text-muted">
										※同名のファイルを開いた場合、古い履歴は上書きされます。
										<br />
										※「履歴を保存」をオフにすると、どちらのモードでも履歴は残らなくなります。
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
							Clear all
						</Button>
					) : null}
				</div>
			</div>

			{!settings.saveHistory && recentFiles.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-raised/40 p-8 text-center text-[13px] text-muted">
					履歴の保存が無効になっています。
				</div>
			) : recentFiles.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-raised/40 p-8 text-center text-[13px] text-muted">
					No recent files yet. Drop a PDF above to start.
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
											? "最新のファイルを開く"
											: "開いた時点の状態を復元"
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
												aria-label="File System Access"
												className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-accent"
											/>
										)}
									</div>
									<div className="truncate text-[12px] font-medium text-fg">
										{item.name}
									</div>
									<div className="mt-0.5 font-mono text-[10px] text-subtle">
										{new Date(item.lastOpened).toLocaleString("ja-JP")}
									</div>
								</button>
								<Button
									type="button"
									onClick={() => void onDeleteRecent(item.id)}
									variant="ghost"
									size="icon-sm"
									className="absolute right-1.5 top-1.5 opacity-0 transition hover:text-danger group-hover:opacity-100"
									aria-label="Delete from library"
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
						LIBRARY
					</div>
					<div className="text-[11px] text-subtle mt-0.5">recent first</div>
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
