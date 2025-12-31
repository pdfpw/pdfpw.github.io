import type { tags } from "typia";
import typia from "typia";

export const assertPdfpcConfigV2 = typia.createAssert<PdfpcConfigV2>();

/** HH:MM (24h) */
export type TimeHHMM = string & tags.Pattern<"^([01]\\d|2[0-3]):[0-5]\\d$">;

export type UInt32 = number & tags.Type<"uint32">;
export type PositiveInt = UInt32 & tags.Minimum<1>;

export type BeamerNotePosition = "none" | "left" | "right" | "top" | "bottom";

export interface PdfpcConfigV2 {
	pdfpcFormat: 2;
	duration?: PositiveInt;
	startTime?: TimeHHMM;
	endTime?: TimeHHMM;
	endSlide?: UInt32;
	savedSlide?: UInt32;
	lastMinutes?: PositiveInt;
	disableMarkdown?: boolean;
	noteFontSize?: PositiveInt;
	defaultTransition?: string;
	beamerNotePosition?: BeamerNotePosition;
	pages?: PdfpcPageV2[];
}

export interface PdfpcPageV2 {
	idx: UInt32;
	label: string;
	overlay: UInt32;
	forcedOverlay?: boolean;
	hidden?: boolean;
	note?: string;
}

export type ResolvedPdfpcPageV2 = {
	/** 1-based absolute page index */
	pageNumber: number;
	label: string;
	/** 0-based grouped page index */
	overlay: number;
	/** Speaker note text */
	note: string;
};

export type ResolvedPdfpcConfigV2 = Omit<
	PdfpcConfigV2,
	"pages" | "defaultTransition" | "beamerNotePosition" | "noteFontSize"
> & {
	defaultTransition: string;
	beamerNotePosition: BeamerNotePosition;
	noteFontSize: PositiveInt;
	pages: ResolvedPdfpcPageV2[][];
	totalOverlays: number;
};

function groupPagesByConsecutiveLabel(
	pages: ResolvedPdfpcPageV2[],
): ResolvedPdfpcPageV2[][] {
	const out: ResolvedPdfpcPageV2[][] = [];
	let current: ResolvedPdfpcPageV2[] = [];
	let currentLabel: string | undefined;

	for (const p of pages) {
		if (currentLabel === undefined || p.label !== currentLabel) {
			if (current.length > 0) {
				out.push(current.sort((a, b) => a.overlay - b.overlay));
			}
			currentLabel = p.label;
			current = [];
		}
		current.push(p);
	}

	if (current.length > 0) {
		out.push(current.sort((a, b) => a.overlay - b.overlay));
	}

	return out;
}

/**
 * pdfpc互換の扱い:
 * - labels からデフォルトの (label, overlay) を構成（連続label内で overlay=0,1,2...）
 * - input.pages に存在する idx は label/overlay/note をそのまま上書き（forcedOverlayの有無は問わない）
 * - それ以外のフィールドは可能な限り undefined を維持し、指定4項目のみ必ず埋める
 */
export function resolvePdfpcConfig(
	input: PdfpcConfigV2 | undefined,
	labels: string[],
): ResolvedPdfpcConfigV2 {
	const src = input?.pages ?? [];

	const overrideByIdx = new Map<number, PdfpcPageV2>();
	for (const p of src) {
		const i = p.idx;
		if (i < 0 || i >= labels.length) continue;
		overrideByIdx.set(i, p);
	}

	// 連続labelごとの overlay=0,1,2...（PDFデフォルト）
	let prevLabel: string | undefined;
	let overlayCounter = 0;

	const linearPages = labels
		.map((pdfLabel, i) => {
			if (prevLabel === undefined || pdfLabel !== prevLabel) {
				overlayCounter = 0;
				prevLabel = pdfLabel;
			}
			const defaultOverlay = overlayCounter;
			overlayCounter++;

			const o = overrideByIdx.get(i);

			return {
				pageNumber: i + 1,
				label: o?.label ?? pdfLabel,
				overlay: o?.overlay ?? defaultOverlay,
				note: o?.note ?? "",
				hidden: o?.hidden === true,
			};
		})
		.filter((p) => !p.hidden)
		.map(({ hidden, ...rest }) => rest);

	const pages = groupPagesByConsecutiveLabel(linearPages);

	return {
		...(input ?? { pdfpcFormat: 2 }),
		defaultTransition: input?.defaultTransition ?? "replace",
		beamerNotePosition: input?.beamerNotePosition ?? "none",
		noteFontSize: input?.noteFontSize ?? 20,
		pages,
		totalOverlays: linearPages.length,
	};
}
