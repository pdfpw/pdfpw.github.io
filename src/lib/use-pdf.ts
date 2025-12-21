import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import * as pdfjs from "pdfjs-dist";
import { useReducer } from "react";

async function loadPdf(
	file: File | FileSystemFileHandle,
): Promise<PDFDocumentLoadingTask> {
	if (!(file instanceof File)) file = await file.getFile();
	return pdfjs.getDocument(await file.arrayBuffer());
}
export function usePdf(file: File | FileSystemFileHandle) {
	return useReducer(
		(_prev: Promise<PDFDocumentLoadingTask>, nextFile: File | FileSystemFileHandle) =>
			loadPdf(nextFile),
		file,
		loadPdf,
	);
}
