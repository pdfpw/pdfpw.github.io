import { memo } from "react";
import { Button } from "#src/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card";
import { formatTime } from "./formatTime";

export const TimerCard = memo(function TimerCard({
	elapsedMs,
	isRunning,
	onPause,
	onStart,
	onReset,
}: {
	elapsedMs: number;
	isRunning: boolean;
	onPause: () => void;
	onStart: () => void;
	onReset: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold text-muted-foreground">
					タイマー
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="text-2xl font-semibold">{formatTime(elapsedMs)}</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{isRunning ? "進行中" : "停止中"}</span>
					<span>Ctrl+Tでリセット</span>
				</div>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="secondary"
						onClick={isRunning ? onPause : onStart}
					>
						{isRunning ? "一時停止" : "開始"}
					</Button>
					<Button size="sm" variant="outline" onClick={onReset}>
						リセット
					</Button>
				</div>
			</CardContent>
		</Card>
	);
});
