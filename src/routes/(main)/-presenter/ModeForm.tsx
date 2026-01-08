import type { ClassValue } from "clsx";
import { MaximizeIcon, MonitorOff, Snowflake } from "lucide-react";
import { Button } from "#src/components/ui/button.tsx";
import { Card, CardContent } from "#src/components/ui/card.tsx";
import { Label } from "#src/components/ui/label.tsx";
import { Switch } from "#src/components/ui/switch.tsx";
import { cn } from "#src/lib/utils.ts";

interface ModeFormProps {
	className?: ClassValue;
	isFrozen: boolean;
	onFrozenChange: (isFrozen: boolean) => void;
	isBlackout: boolean;
	onBlackoutChange: (isBlackout: boolean) => void;
}

export function ModeForm({
	className,
	isFrozen,
	onFrozenChange,
	isBlackout,
	onBlackoutChange,
}: ModeFormProps) {
	return (
		<Card className={cn("shadow-2xs", className)}>
			<CardContent className="flex gap-4 flex-wrap">
				<div className="flex-1 flex items-center justify-between space-x-2 rounded-lg border p-3 shadow-xs">
					<div className="flex items-center space-x-2">
						<div className="bg-primary/10 text-primary flex items-center justify-center rounded-full p-1.5 ring-1 ring-inset">
							<Snowflake className="size-4" />
						</div>
						<Label htmlFor="frozen-mode" className="font-medium cursor-pointer">
							投影固定
						</Label>
					</div>
					<Switch
						id="frozen-mode"
						checked={isFrozen}
						onCheckedChange={onFrozenChange}
					/>
				</div>
				<div className="flex-1 flex items-center justify-between space-x-2 rounded-lg border p-3 shadow-xs">
					<div className="flex items-center space-x-2">
						<div className="bg-destructive/10 text-destructive flex items-center justify-center rounded-full p-1.5 ring-1 ring-inset">
							<MonitorOff className="size-4" />
						</div>
						<Label
							htmlFor="stop-presentation"
							className="font-medium cursor-pointer"
						>
							投影停止
						</Label>
					</div>
					<Switch
						id="stop-presentation"
						checked={isBlackout}
						onCheckedChange={onBlackoutChange}
					/>
				</div>
				<Button type="button" variant={"outline"} className="flex-1 h-full p-3">
					<div className="bg-primary/10 text-primary flex items-center justify-center rounded-full p-1.5 ring-1 ring-inset">
						<MaximizeIcon className="size-4" />
					</div>
					最大化
				</Button>
			</CardContent>
		</Card>
	);
}
