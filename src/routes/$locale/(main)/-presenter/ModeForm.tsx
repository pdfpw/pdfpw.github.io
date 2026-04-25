import type { ClassValue } from "clsx";
import { Grid, MonitorOff, Snowflake } from "lucide-react";
import * as m from "#src/paraglide/messages.js";
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
						aria-label={m.mode_freeze_aria()}
					>
						<Snowflake className="size-4 shrink-0" />
						<span className="hidden @[20rem]:inline">{m.mode_freeze()}</span>
					</Button>
					<Button
						type="button"
						variant={isBlackout ? "accent-ghost" : "ghost"}
						aria-pressed={isBlackout}
						className="flex-1 gap-2 h-9 min-w-0"
						size={"default"}
						onClick={() => onBlackoutChange(!isBlackout)}
						aria-label={m.mode_blackout_aria()}
					>
						<MonitorOff className="size-4 shrink-0" />
						<span className="hidden @[20rem]:inline">{m.mode_blackout()}</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						className="flex-1 gap-2 h-9 min-w-0"
						size={"default"}
						onClick={onOverviewModeOpen}
						aria-label={m.mode_overview_aria()}
					>
						<Grid className="size-4 shrink-0" />
						<span className="hidden @[20rem]:inline">{m.mode_overview()}</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
