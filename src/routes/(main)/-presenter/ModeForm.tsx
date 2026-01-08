import type { ClassValue } from "clsx";
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
		<Card className={cn("p-4 shadow-2xs", className)}>
			<CardContent className="grid gap-2 px-2">
				<div className="flex items-center gap-2">
					<Switch
						id="frozen-mode"
						checked={isFrozen}
						onCheckedChange={onFrozenChange}
					></Switch>
					<Label htmlFor="frozen-mode">投影固定</Label>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id="stop-presentation"
						checked={isBlackout}
						onCheckedChange={onBlackoutChange}
					></Switch>
					<Label>投影停止</Label>
				</div>
			</CardContent>
		</Card>
	);
}
