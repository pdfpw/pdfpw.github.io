import { atom } from "jotai";

export type ToolMode = "none" | "laser" | "pen";

export interface NormalizedPoint {
	x: number;
	y: number;
}

export interface PenStroke {
	id: string;
	points: NormalizedPoint[];
	ended: boolean;
}

export const toolModeAtom = atom<ToolMode>("none");
export const laserPosAtom = atom<NormalizedPoint | null>(null);
export const penStrokesAtom = atom<PenStroke[]>([]);

export const addPenStroke = atom(
	null,
	(get, set, payload: { strokeId: string; x: number; y: number }) => {
		const strokes = get(penStrokesAtom);
		if (strokes.some((s) => s.id === payload.strokeId)) return;
		set(penStrokesAtom, [
			...strokes,
			{
				id: payload.strokeId,
				points: [{ x: payload.x, y: payload.y }],
				ended: false,
			},
		]);
	},
);

export const addPenPoint = atom(
	null,
	(get, set, payload: { strokeId: string; x: number; y: number }) => {
		const strokes = get(penStrokesAtom);
		const existing = strokes.find((s) => s.id === payload.strokeId);
		if (!existing) {
			set(penStrokesAtom, [
				...strokes,
				{
					id: payload.strokeId,
					points: [{ x: payload.x, y: payload.y }],
					ended: false,
				},
			]);
			return;
		}
		set(
			penStrokesAtom,
			strokes.map((s) =>
				s.id === payload.strokeId
					? { ...s, points: [...s.points, { x: payload.x, y: payload.y }] }
					: s,
			),
		);
	},
);

export const endPenStroke = atom(
	null,
	(get, set, payload: { strokeId: string }) => {
		const strokes = get(penStrokesAtom);
		set(
			penStrokesAtom,
			strokes.map((s) =>
				s.id === payload.strokeId ? { ...s, ended: true } : s,
			),
		);
	},
);

export const clearPenStrokes = atom(null, (_get, set) => {
	set(penStrokesAtom, []);
});
