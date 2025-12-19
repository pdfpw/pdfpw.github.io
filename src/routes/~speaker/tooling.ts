export type ToolMode = "none" | "pointer" | "pen" | "eraser" | "spotlight";

export const TOOL_OPTIONS: Array<{
	value: ToolMode;
	label: string;
	key: string;
}> = [
	{ value: "none", label: "通常", key: "1" },
	{ value: "pointer", label: "ポインタ", key: "2" },
	{ value: "pen", label: "ペン", key: "3" },
	{ value: "eraser", label: "消しゴム", key: "4" },
	{ value: "spotlight", label: "スポットライト", key: "5" },
];

export function toolModeLabel(mode: ToolMode) {
	const found = TOOL_OPTIONS.find((option) => option.value === mode);
	return found ? found.label : "通常";
}
