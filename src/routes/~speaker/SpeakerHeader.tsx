import { memo } from "react";
import { Button } from "#src/components/ui/button";

export const SpeakerHeader = memo(function SpeakerHeader({
	fileName,
	hasConfig,
	pageNumber,
	totalPages,
	audienceStatus,
	onOpenOverview,
	onOpenAudience,
}: {
	fileName: string;
	hasConfig: boolean;
	pageNumber: number;
	totalPages: number;
	audienceStatus: string | null;
	onOpenOverview: () => void;
	onOpenAudience: () => void;
}) {
	return (
		<header className="border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Speaker</span>
					<h1 className="text-lg font-semibold">{fileName}</h1>
					<div className="text-xs text-muted-foreground">
						{hasConfig ? "pdfpc 設定読み込み済み" : "pdfpc 設定なし"}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="rounded-md border border-border px-3 py-2 text-sm">
						<span className="text-muted-foreground">ページ</span>{" "}
						<span className="font-semibold">
							{pageNumber}/{totalPages}
						</span>
					</div>
					<Button variant="secondary" onClick={onOpenOverview}>
						Overview
					</Button>
					<Button variant="outline" onClick={onOpenAudience}>
						Audienceを開く
					</Button>
				</div>
			</div>
			{audienceStatus ? (
				<p className="mt-3 text-sm text-destructive">{audienceStatus}</p>
			) : null}
		</header>
	);
});
