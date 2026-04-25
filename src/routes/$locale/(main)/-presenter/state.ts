import type { Register, RouterEvent } from "@tanstack/react-router";
import { atom } from "jotai";
import { getDocument } from "pdfjs-dist";
import {
	assertPdfpcConfigV2,
	resolvePdfpcConfig,
} from "#src/lib/pdfpc-config.ts";
import { getRecentFileById, openDb } from "#src/lib/recent-store.ts";
import type { PresenterSearch } from "../presenter";

// null: Loading
// "": No file
export const fileNameOrFileAtom = atom<
	| null
	| string
	| { pdf: File | FileSystemFileHandle; pdfpc?: File | FileSystemFileHandle }
>(null);

function isPresenterPath(pathname: string): boolean {
	return /^\/(?:en|ja)\/presenter\/?$/.test(pathname);
}

export function subscribePresenterRoute(router: Register["router"]) {
	fileNameOrFileAtom.onMount = (setValue) => {
		const sync = (event: Pick<RouterEvent, "toLocation" | "fromLocation">) => {
			if (
				isPresenterPath(event.toLocation.pathname) &&
				event.fromLocation?.searchStr !== event.toLocation.searchStr
			) {
				const { pdf, pdfpc } = event.toLocation.state;
				if (pdf) {
					setValue({ pdf, pdfpc });
				} else {
					const fileName = (event.toLocation.search as PresenterSearch).file;
					setValue(fileName ?? "");
				}
			} else if (
				!isPresenterPath(event.toLocation.pathname) &&
				isPresenterPath(event.fromLocation?.pathname ?? "")
			) {
				setValue(null);
			}
		};

		sync({
			toLocation: router.state.location,
		});

		return router.subscribe("onBeforeLoad", sync);
	};
}

export const pdfFileAtom = atom<
	Promise<null | {
		pdf: File;
		pdfpc: File | undefined;
	}>
>(async (get) => {
	const fileNameOrFile = get(fileNameOrFileAtom);
	if (!fileNameOrFile) {
		console.log("No file specified");
		return null;
	}
	let fileHandles: {
		pdf: File | FileSystemFileHandle;
		pdfpc?: File | FileSystemFileHandle;
	};
	if (typeof fileNameOrFile === "string") {
		const recentFile = await getRecentFileById(await openDb(), fileNameOrFile);
		if (!recentFile) {
			console.log(`No recent file found for id: ${fileNameOrFile}`);
			return null;
		}
		const pdf = recentFile.handle ?? recentFile.file;
		if (!pdf) {
			console.log(`No PDF file found for recent file id: ${fileNameOrFile}`);
			return null;
		}
		fileHandles = {
			pdf,
			pdfpc: recentFile.configHandle ?? recentFile.configFile,
		};
	} else {
		fileHandles = fileNameOrFile;
	}
	const { pdf, pdfpc } = fileHandles;
	return {
		pdf: pdf instanceof File ? pdf : await pdf.getFile(),
		pdfpc: !pdfpc
			? undefined
			: pdfpc instanceof File
				? pdfpc
				: await pdfpc.getFile(),
	};
});

export const pdfProxyAtom = atom(async (get) => {
	const files = await get(pdfFileAtom);
	if (!files) throw new Error("PDF_NOT_READY");
	return getDocument(await files.pdf.arrayBuffer()).promise;
});
export const slidePageNumbersAtom = atom(async (get) => {
	const pdfProxy = await get(pdfProxyAtom);
	return (
		(await pdfProxy.getPageLabels()) ??
		Array.from({ length: pdfProxy.numPages }, (_, i) => (i + 1).toString())
	);
});
export const pdfpcConfigAtom = atom(async (get) => {
	const files = await get(pdfFileAtom);
	if (!files) throw new Error("PDFPC_CONFIG_NOT_READY");
	const labels = await get(slidePageNumbersAtom);
	if (!files.pdfpc) {
		return resolvePdfpcConfig(undefined, labels);
	}
	const pdfpc = JSON.parse(await files.pdfpc.text());
	return resolvePdfpcConfig(assertPdfpcConfigV2(pdfpc), labels);
});
