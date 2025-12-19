import { memo } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card";
import { cn } from "#src/lib/utils";

export const NotesCard = memo(function NotesCard({
	noteValue,
	isNoteEditing,
	pageNumber,
	onNoteChange,
}: {
	noteValue: string;
	isNoteEditing: boolean;
	pageNumber: number;
	onNoteChange: (value: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold text-muted-foreground">
					ノート
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<textarea
					key={isNoteEditing ? "notes-edit" : "notes-view"}
					value={noteValue}
					onChange={(event) => onNoteChange(event.target.value)}
					readOnly={!isNoteEditing}
					rows={6}
					placeholder="Ctrl+Nで編集開始"
					className={cn(
						"w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						!isNoteEditing && "text-muted-foreground",
					)}
				/>
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>{isNoteEditing ? "Escで編集終了" : "Ctrl+Nで編集"}</span>
					<span>ページ {pageNumber}</span>
				</div>
			</CardContent>
		</Card>
	);
});
