import { useAtomValue } from "jotai";
import { memo } from "react";
import {
	laserPosAtom,
	type PenStroke,
	penStrokesAtom,
	toolModeAtom,
} from "#src/lib/pointer-state.ts";
import { cn } from "#src/lib/utils.ts";

interface PointerOverlayProps {
	className?: string;
}

const PEN_COLOR = "#ef4444";
// vectorEffect="non-scaling-stroke" は strokeWidth を CSS pixel で解釈するため px 値で指定する
const PEN_WIDTH_PX = 3;

const Stroke = memo(function Stroke({ stroke }: { stroke: PenStroke }) {
	if (stroke.points.length === 0) return null;
	return (
		<polyline
			points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
			fill="none"
			stroke={PEN_COLOR}
			strokeWidth={PEN_WIDTH_PX}
			strokeLinecap="round"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
		/>
	);
});

export function PointerOverlay({ className }: PointerOverlayProps) {
	const toolMode = useAtomValue(toolModeAtom);
	const laserPos = useAtomValue(laserPosAtom);
	const strokes = useAtomValue(penStrokesAtom);

	if (toolMode === "none" && strokes.length === 0) return null;

	return (
		<svg
			className={cn("absolute inset-0 pointer-events-none", className)}
			viewBox="0 0 1 1"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{strokes.map((stroke) => (
				<Stroke key={stroke.id} stroke={stroke} />
			))}
			{toolMode === "laser" && laserPos !== null ? (
				<circle
					cx={laserPos.x}
					cy={laserPos.y}
					r={0.008}
					fill={PEN_COLOR}
					opacity={0.8}
					style={{ mixBlendMode: "multiply" }}
				/>
			) : null}
		</svg>
	);
}
