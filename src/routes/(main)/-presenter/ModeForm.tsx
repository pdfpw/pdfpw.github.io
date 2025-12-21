import type { ClassValue } from "clsx";
import { Card, CardContent } from "#src/components/ui/card.tsx";
import { Label } from "#src/components/ui/label.tsx";
import { Switch } from "#src/components/ui/switch.tsx";
import { cn } from "#src/lib/utils.ts";

interface ModeFormProps {
	className?: ClassValue;
	isFrozen: boolean;
	onChangeIsFrozen: (isFrozen: boolean) => void;
}

export function ModeForm({
	className,
	isFrozen,
	onChangeIsFrozen,
}: ModeFormProps) {
	return (
		<Card className={cn("p-4 shadow-2xs", className)}>
			<CardContent className="grid gap-2 px-2">
				<div className="flex items-center gap-2">
					<Switch
						id="frozen-mode"
						checked={isFrozen}
						onCheckedChange={onChangeIsFrozen}
					></Switch>
					<Label htmlFor="frozen-mode">Frozen Mode</Label>
				</div>
			</CardContent>
		</Card>
	);
}
