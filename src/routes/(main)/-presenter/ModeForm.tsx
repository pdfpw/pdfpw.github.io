import type { ClassValue } from "clsx";
import { MonitorOff, Snowflake } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card.tsx";
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
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">投影ウィンドウ</CardTitle>
				<CardDescription>投影ウィンドウの表示設定を変更します</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div className="flex items-center justify-between space-x-2 rounded-lg border p-3 shadow-xs">
					<div className="flex items-center space-x-2">
						<div className="bg-primary/10 text-primary flex items-center justify-center rounded-full p-1.5 ring-1 ring-inset">
							<Snowflake className="h-4 w-4" />
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
				<div className="flex items-center justify-between space-x-2 rounded-lg border p-3 shadow-xs">
					<div className="flex items-center space-x-2">
						<div className="bg-destructive/10 text-destructive flex items-center justify-center rounded-full p-1.5 ring-1 ring-inset">
							<MonitorOff className="h-4 w-4" />
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
			</CardContent>
		</Card>
	);
}
