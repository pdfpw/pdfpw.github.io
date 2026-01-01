import { CircleHelp, FileClock, FileSymlink } from "lucide-react";
import { Button } from "#src/components/ui/button";
import { Card } from "#src/components/ui/card";
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

type RecentSectionProps = {
	supportsFSA: boolean;
	recentFiles: RecentFile[];
	settings: Settings;
	onToggleHistory: (value: boolean) => void;
	onClearRecent: () => Promise<void> | void;
	onRecentClick: (item: RecentFile) => Promise<void>;
	onDeleteRecent: (id: string) => Promise<void>;
};

export function RecentSection({
	supportsFSA,
	recentFiles,
	settings,
	onToggleHistory,
	onClearRecent,
	onRecentClick,
	onDeleteRecent,
}: RecentSectionProps) {
	return (
		<section className="container mx-auto max-w-6xl px-6 pb-16">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h2 className="text-xl font-semibold text-foreground">
						最近開いたファイル
					</h2>
					<div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 shadow-sm">
						<Switch
							id="save-history"
							checked={settings.saveHistory}
							onCheckedChange={onToggleHistory}
						/>
						<label
							htmlFor="save-history"
							className="text-xs font-medium text-muted-foreground select-none"
						>
							履歴を保存
						</label>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="ghost" size="icon-sm" className="rounded-full">
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
									<p className="text-xs text-muted-foreground">
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
							履歴をすべて消去
						</Button>
					) : null}
				</div>
			</div>

			{!settings.saveHistory && recentFiles.length === 0 ? (
				<Card className="mt-4 border-dashed bg-card p-4 text-sm text-muted-foreground gap-0">
					履歴の保存が無効になっています。
				</Card>
			) : recentFiles.length === 0 ? (
				<Card className="mt-4 border-dashed bg-card p-4 text-sm text-muted-foreground gap-0">
					まだ履歴がありません。ファイルを開くとここに表示されます。
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
									<div
										className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow"
										title={
											item.handle
												? "最新のファイルを開く"
												: "開いた時点の状態を復元"
										}
									>
										{item.handle ? (
											<FileSymlink className="h-5 w-5" />
										) : (
											<FileClock className="h-5 w-5" />
										)}
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
		<section className="container mx-auto max-w-6xl px-6 pb-16">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h2 className="text-xl font-semibold text-foreground">
						最近開いたファイル
					</h2>
					<div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 shadow-sm">
						<Skeleton className="h-5 w-9 rounded-full" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full"
						disabled
					>
						<CircleHelp className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
		</section>
	);
}
