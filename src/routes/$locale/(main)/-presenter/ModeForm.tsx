import type { ClassValue } from "clsx";
import { Grid, MonitorOff, Snowflake } from "lucide-react";
import { Button } from "#src/components/ui/button.tsx";
import { Card, CardContent } from "#src/components/ui/card.tsx";
import { cn } from "#src/lib/utils.ts";

interface ModeFormProps {
	className?: ClassValue;
	isFrozen: boolean;
	onFrozenChange: (isFrozen: boolean) => void;
	isBlackout: boolean;
	onBlackoutChange: (isBlackout: boolean) => void;
	onOverviewModeOpen: () => void;
}

export function ModeForm({
	className,
	isFrozen,
	onFrozenChange,
	isBlackout,
	onBlackoutChange,
	onOverviewModeOpen,
}: ModeFormProps) {
	return (
		<Card className={cn("py-3 @container", className)}>
			<CardContent className="px-3">
				<div className="flex gap-2">
					<Button
						type="button"
						variant={isFrozen ? "accent-ghost" : "ghost"}
						aria-pressed={isFrozen}
						className="flex-1 gap-2 h-9 min-w-0"
						size={"default"}
						onClick={() => onFrozenChange(!isFrozen)}
						aria-label="投影固定"
					>
						<Snowflake className="size-4 shrink-0" />
						<span className="hidden @[20rem]:inline">投影固定</span>
					</Button>
					<Button
						type="button"
						variant={isBlackout ? "accent-ghost" : "ghost"}
						aria-pressed={isBlackout}
						className="flex-1 gap-2 h-9 min-w-0"
						size={"default"}
						onClick={() => onBlackoutChange(!isBlackout)}
						aria-label="投影停止"
					>
						<MonitorOff className="size-4 shrink-0" />
						<span className="hidden @[20rem]:inline">投影停止</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						className="flex-1 gap-2 h-9 min-w-0"
						size={"default"}
						onClick={onOverviewModeOpen}
						aria-label="一覧表示"
					>
						<Grid className="size-4 shrink-0" />
						<span className="hidden @[20rem]:inline">一覧表示</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
