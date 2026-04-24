import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
	addPenPoint,
	addPenStroke,
	clearPenStrokes,
	endPenStroke,
	laserPosAtom,
	penStrokesAtom,
	toolModeAtom,
} from "./pointer-state.ts";

describe("toolModeAtom", () => {
	it("初期値は none", () => {
		const store = createStore();
		expect(store.get(toolModeAtom)).toBe("none");
	});
	it("laser/pen/none に切り替えできる", () => {
		const store = createStore();
		store.set(toolModeAtom, "laser");
		expect(store.get(toolModeAtom)).toBe("laser");
		store.set(toolModeAtom, "pen");
		expect(store.get(toolModeAtom)).toBe("pen");
		store.set(toolModeAtom, "none");
		expect(store.get(toolModeAtom)).toBe("none");
	});
});

describe("laserPosAtom", () => {
	it("初期値は null", () => {
		const store = createStore();
		expect(store.get(laserPosAtom)).toBe(null);
	});
});

describe("penStrokes 操作", () => {
	it("addPenStroke で新規ストローク追加", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0.1, y: 0.2 });
		expect(store.get(penStrokesAtom)).toEqual([
			{ id: "s1", points: [{ x: 0.1, y: 0.2 }], ended: false },
		]);
	});

	it("addPenPoint で既存ストロークに点追加", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0.1, y: 0.2 });
		store.set(addPenPoint, { strokeId: "s1", x: 0.3, y: 0.4 });
		expect(store.get(penStrokesAtom)[0].points).toEqual([
			{ x: 0.1, y: 0.2 },
			{ x: 0.3, y: 0.4 },
		]);
	});

	it("addPenPoint で未知の strokeId ならストロークを自動作成", () => {
		const store = createStore();
		store.set(addPenPoint, { strokeId: "s_new", x: 0.5, y: 0.5 });
		expect(store.get(penStrokesAtom)).toEqual([
			{ id: "s_new", points: [{ x: 0.5, y: 0.5 }], ended: false },
		]);
	});

	it("endPenStroke で ended=true", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0, y: 0 });
		store.set(endPenStroke, { strokeId: "s1" });
		expect(store.get(penStrokesAtom)[0].ended).toBe(true);
	});

	it("clearPenStrokes で空", () => {
		const store = createStore();
		store.set(addPenStroke, { strokeId: "s1", x: 0, y: 0 });
		store.set(clearPenStrokes);
		expect(store.get(penStrokesAtom)).toEqual([]);
	});
});
