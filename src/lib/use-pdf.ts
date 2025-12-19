import * as pdfjs from "pdfjs-dist";
import { useReducer } from "react";

async function loadPdf(file: File | FileSystemFileHandle) {
	if (!(file instanceof File)) file = await file.getFile();
	return pdfjs.getDocument(await file.arrayBuffer());
}
export function usePdf(file: File | FileSystemFileHandle) {
	return useReducer(
		(_, file: File | FileSystemFileHandle) => loadPdf(file),
		file,
		loadPdf,
	);
}
