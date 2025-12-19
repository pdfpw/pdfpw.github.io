import { memo } from "react";
import { Button } from "#src/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#src/components/ui/card";
import type { ToolMode } from "./tooling";
import { TOOL_OPTIONS } from "./tooling";

export const ToolsCard = memo(function ToolsCard({
	toolMode,
	toolSize,
	onSelectTool,
	onDecreaseToolSize,
	onIncreaseToolSize,
	isFrozen,
	isBlackout,
	onToggleFreeze,
	onToggleBlackout,
}: {
	toolMode: ToolMode;
	toolSize: number;
	onSelectTool: (mode: ToolMode) => void;
	onDecreaseToolSize: () => void;
	onIncreaseToolSize: () => void;
	isFrozen: boolean;
	isBlackout: boolean;
	onToggleFreeze: () => void;
	onToggleBlackout: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold text-muted-foreground">
					ツール
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="grid grid-cols-2 gap-2">
					{TOOL_OPTIONS.map((option) => (
						<Button
							key={option.value}
							size="sm"
							variant={toolMode === option.value ? "default" : "secondary"}
							onClick={() => onSelectTool(option.value)}
						>
							{option.label}
						</Button>
					))}
				</div>
				<div className="flex items-center justify-between gap-2">
					<div className="text-xs text-muted-foreground">
						サイズ: {toolSize}
					</div>
					<div className="flex gap-2">
						<Button
							size="icon-sm"
							variant="outline"
							onClick={onDecreaseToolSize}
						>
							-
						</Button>
						<Button
							size="icon-sm"
							variant="outline"
							onClick={onIncreaseToolSize}
						>
							+
						</Button>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant={isFrozen ? "default" : "outline"}
						onClick={onToggleFreeze}
					>
						Freeze
					</Button>
					<Button
						size="sm"
						variant={isBlackout ? "default" : "outline"}
						onClick={onToggleBlackout}
					>
						ブラックアウト
					</Button>
				</div>
			</CardContent>
		</Card>
	);
});
