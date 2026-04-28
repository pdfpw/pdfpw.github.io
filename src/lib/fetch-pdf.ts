export type FetchPdfErrorKind =
	| "invalid-url"
	| "cors-or-network"
	| "http-error"
	| "not-pdf"
	| "aborted";

export class FetchPdfError extends Error {
	kind: FetchPdfErrorKind;
	status?: number;

	constructor(kind: FetchPdfErrorKind, message: string, status?: number) {
		super(message);
		this.name = "FetchPdfError";
		this.kind = kind;
		this.status = status;
	}
}

export interface FetchedPdf {
	pdf: File;
	pdfpc?: File;
	sourceUrl: string;
}

export interface FetchPdfOptions {
	signal?: AbortSignal;
	fetchImpl?: typeof fetch;
	/**
	 * Explicit pdfpc URL. When provided, overrides sibling auto-detection
	 * and a failure becomes a hard error (caller-specified URLs are not optional).
	 */
	pdfpcUrl?: string;
}

const PDF_MIME = "application/pdf";

function deriveBaseName(url: URL): string {
	const segments = url.pathname.split("/").filter(Boolean);
	const last = segments[segments.length - 1];
	if (!last) return "document.pdf";
	try {
		return decodeURIComponent(last);
	} catch {
		return last;
	}
}

function ensurePdfName(name: string): string {
	return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

function siblingPdfpcUrl(url: URL): URL | null {
	if (!/\.pdf$/i.test(url.pathname)) return null;
	const next = new URL(url.toString());
	next.pathname = next.pathname.replace(/\.pdf$/i, ".pdfpc");
	return next;
}

function looksLikePdfBytes(bytes: Uint8Array): boolean {
	// PDF magic header "%PDF-"
	return (
		bytes.length >= 5 &&
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46 &&
		bytes[4] === 0x2d
	);
}

export function parsePdfUrl(input: string): URL {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new FetchPdfError("invalid-url", `Invalid URL: ${input}`);
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new FetchPdfError(
			"invalid-url",
			`Unsupported protocol: ${url.protocol}`,
		);
	}
	return url;
}

async function fetchAsFile(
	url: URL,
	expectedMime: string,
	options: FetchPdfOptions,
): Promise<File> {
	const fetchImpl = options.fetchImpl ?? fetch;
	let response: Response;
	try {
		response = await fetchImpl(url.toString(), {
			signal: options.signal,
			redirect: "follow",
			credentials: "omit",
		});
	} catch (error) {
		if ((error as DOMException)?.name === "AbortError") {
			throw new FetchPdfError("aborted", "Fetch aborted");
		}
		throw new FetchPdfError(
			"cors-or-network",
			`Failed to fetch ${url.toString()}: ${(error as Error).message}`,
		);
	}

	if (!response.ok) {
		throw new FetchPdfError(
			"http-error",
			`HTTP ${response.status} ${response.statusText} for ${url.toString()}`,
			response.status,
		);
	}

	const buffer = await response.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	if (expectedMime === PDF_MIME && !looksLikePdfBytes(bytes)) {
		throw new FetchPdfError(
			"not-pdf",
			`Response from ${url.toString()} is not a PDF`,
		);
	}

	const name =
		expectedMime === PDF_MIME
			? ensurePdfName(deriveBaseName(url))
			: deriveBaseName(url);

	return new File([buffer], name, { type: expectedMime });
}

function alignPdfpcName(pdfpcFile: File, pdfFile: File): File {
	const base = pdfFile.name.replace(/\.pdf$/i, "");
	const expected = new RegExp(`^${escapeRegExp(base)}\\.pdfpc$`, "i");
	if (expected.test(pdfpcFile.name)) return pdfpcFile;
	return new File([pdfpcFile], `${base}.pdfpc`, {
		type: "application/json",
	});
}

export async function fetchPdfFromUrl(
	rawUrl: string,
	options: FetchPdfOptions = {},
): Promise<FetchedPdf> {
	const url = parsePdfUrl(rawUrl);
	const pdfFile = await fetchAsFile(url, PDF_MIME, options);

	let pdfpcFile: File | undefined;
	if (options.pdfpcUrl) {
		// caller-specified pdfpc URL: failure is a hard error
		const explicitPdfpcUrl = parsePdfUrl(options.pdfpcUrl);
		const fetched = await fetchAsFile(
			explicitPdfpcUrl,
			"application/json",
			options,
		);
		pdfpcFile = alignPdfpcName(fetched, pdfFile);
	} else {
		const pdfpcUrl = siblingPdfpcUrl(url);
		if (pdfpcUrl) {
			try {
				const fetched = await fetchAsFile(
					pdfpcUrl,
					"application/json",
					options,
				);
				pdfpcFile = alignPdfpcName(fetched, pdfFile);
			} catch (error) {
				if ((error as FetchPdfError)?.kind === "aborted") throw error;
				// silently ignore: missing sibling .pdfpc is normal
				pdfpcFile = undefined;
			}
		}
	}

	return { pdf: pdfFile, pdfpc: pdfpcFile, sourceUrl: url.toString() };
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
