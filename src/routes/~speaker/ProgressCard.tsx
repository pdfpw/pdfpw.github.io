import { memo, type RefObject } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card";

export const ProgressCard = memo(function ProgressCard({
	pageNumber,
	totalPages,
	progress,
	gotoInputRef,
	gotoInputId,
	onGoto,
}: {
	pageNumber: number;
	totalPages: number;
	progress: number;
	gotoInputRef: RefObject<HTMLInputElement>;
	gotoInputId: string;
	onGoto: (page: number) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold text-muted-foreground">
					進捗
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">現在</span>
					<span className="font-semibold">
						{pageNumber}/{totalPages}
					</span>
				</div>
				<div className="h-2 w-full rounded-full bg-muted">
					<div
						className="h-2 rounded-full bg-primary transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<div className="flex items-center gap-2">
					<label
						className="text-xs text-muted-foreground"
						htmlFor={gotoInputId}
					>
						Goto
					</label>
					<input
						ref={gotoInputRef}
						id={gotoInputId}
						type="number"
						min={1}
						max={totalPages}
						value={pageNumber}
						onChange={(event) => {
							const nextValue = Number(event.target.value);
							if (Number.isNaN(nextValue)) return;
							onGoto(nextValue);
						}}
						className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>
			</CardContent>
		</Card>
	);
});
