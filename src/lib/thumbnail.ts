import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const THUMBNAIL_WIDTH = 400;

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(file);
	});
}

export async function generateThumbnail(pdf: File): Promise<string | null> {
	let pdfDoc: Awaited<ReturnType<typeof getDocument>["promise"]> | undefined;
	try {
		const arrayBuffer = await readFileAsArrayBuffer(pdf);
		pdfDoc = await getDocument(arrayBuffer).promise;
		const page = await pdfDoc.getPage(1);
		const viewport = page.getViewport({ scale: 1 });
		const scale = THUMBNAIL_WIDTH / viewport.width;
		const scaledViewport = page.getViewport({ scale });

		const canvas = document.createElement("canvas");
		canvas.width = Math.round(scaledViewport.width);
		canvas.height = Math.round(scaledViewport.height);

		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport })
			.promise;
		return canvas.toDataURL("image/jpeg", 0.7);
	} catch {
		return null;
	} finally {
		await pdfDoc?.destroy();
	}
}
