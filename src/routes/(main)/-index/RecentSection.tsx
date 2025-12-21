import { FileIcon } from "lucide-react";
import { Button } from "#src/components/ui/button";
import { Card } from "#src/components/ui/card";
import { Skeleton } from "#src/components/ui/skeleton";
import type { RecentFile } from "#src/lib/recent-store";

type RecentSectionProps = {
	supportsFSA: boolean;
	recentFiles: RecentFile[];
	onClearRecent: () => Promise<void> | void;
	onRecentClick: (item: RecentFile) => Promise<void>;
	onDeleteRecent: (id: string) => Promise<void>;
};

export function RecentSection({
	supportsFSA,
	recentFiles,
	onClearRecent,
	onRecentClick,
	onDeleteRecent,
}: RecentSectionProps) {
	return (
		<section className="mx-auto max-w-6xl px-6 pb-16">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-foreground">
					最近開いたファイル
				</h2>
				{supportsFSA && recentFiles.length > 0 ? (
					<Button
						type="button"
						onClick={onClearRecent}
						variant="ghost"
						size="sm"
					>
						履歴をすべて消去
					</Button>
				) : null}
			</div>

			{!supportsFSA ? (
				<Card className="mt-4 border-dashed bg-card/80 p-4 text-sm text-muted-foreground gap-0">
					ブラウザが File System Access API
					に対応していないため、履歴は表示されません。
				</Card>
			) : recentFiles.length === 0 ? (
				<Card className="mt-4 border-dashed bg-card p-4 text-sm text-muted-foreground gap-0">
					まだ履歴がありません。File System Access で開くとここに表示されます。
				</Card>
			) : (
				<ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{recentFiles.map((item) => (
						<li key={item.id}>
							<Card className="group flex-row items-center justify-between gap-0 p-4 transition hover:-translate-y-px hover:shadow-md">
								<button
									type="button"
									onClick={() => void onRecentClick(item)}
									className="flex flex-1 items-center gap-3 text-left"
								>
									<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
										<FileIcon className="h-5 w-5" />
									</div>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-foreground">
											{item.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(item.lastOpened).toLocaleString("ja-JP")}
										</p>
									</div>
								</button>
								<Button
									type="button"
									onClick={() => void onDeleteRecent(item.id)}
									variant="ghost"
									className="ml-3 opacity-0 transition hover:text-destructive group-hover:opacity-100"
									size="sm"
								>
									削除
								</Button>
							</Card>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export function RecentSectionLoading() {
	return (
		<section className="mx-auto max-w-6xl px-6 pb-16">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-foreground">
					最近開いたファイル
				</h2>
			</div>
			<div className="mt-6 space-y-3">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<Card
							key={`recent-skeleton-${
								// biome-ignore lint/suspicious/noArrayIndexKey: valueはundefinedだから問題ない
								index
							}`}
							className="flex-row items-center gap-3 p-4"
						>
							<Skeleton className="h-11 w-11 rounded-lg" />
							<div className="min-w-0 flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
