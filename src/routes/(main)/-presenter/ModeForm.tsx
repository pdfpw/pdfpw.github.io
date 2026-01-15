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
		<Card className={cn("shadow-2xs", className)}>
			<CardContent className="p-2">
				<div className="flex gap-2">
					<Button
						type="button"
						variant={isFrozen ? "default" : "outline"}
						className="flex-1 gap-2 h-9"
						size={"default"}
						onClick={() => onFrozenChange(!isFrozen)}
					>
						<Snowflake className="size-4" />
						<span>投影固定</span>
					</Button>
					<Button
						type="button"
						variant={isBlackout ? "default" : "outline"}
						className="flex-1 gap-2 h-9"
						size={"default"}
						onClick={() => onBlackoutChange(!isBlackout)}
					>
						<MonitorOff className="size-4" />
						<span>投影停止</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						className="flex-1 gap-2 h-9"
						size={"default"}
						onClick={onOverviewModeOpen}
					>
						<Grid className="size-4" />
						<span>一覧表示</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
