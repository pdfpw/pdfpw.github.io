import { describe, expect, it, vi } from "vitest";
import { FetchPdfError, fetchPdfFromUrl } from "./fetch-pdf.ts";

const PDF_MAGIC = new Uint8Array([
	0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
]); // "%PDF-1.7"

function pdfResponse(extraBytes: number[] = []): Response {
	const buf = new Uint8Array(PDF_MAGIC.length + extraBytes.length);
	buf.set(PDF_MAGIC, 0);
	buf.set(extraBytes, PDF_MAGIC.length);
	return new Response(buf, {
		status: 200,
		headers: { "Content-Type": "application/pdf" },
	});
}

function notFoundResponse(): Response {
	return new Response("not found", { status: 404, statusText: "Not Found" });
}

describe("fetchPdfFromUrl", () => {
	it("有効な PDF URL から File を取得する", async () => {
		const fetchImpl = vi.fn(async (input: string) => {
			if (input.endsWith(".pdf")) return pdfResponse([0x0a]);
			return notFoundResponse();
		}) as unknown as typeof fetch;

		const result = await fetchPdfFromUrl("https://example.com/slides.pdf", {
			fetchImpl,
		});
		expect(result.pdf.name).toBe("slides.pdf");
		expect(result.pdf.type).toBe("application/pdf");
		expect(result.pdfpc).toBeUndefined();
		expect(result.sourceUrl).toBe("https://example.com/slides.pdf");
	});

	it("sibling .pdfpc が見つかれば添付する", async () => {
		const fetchImpl = vi.fn(async (input: string) => {
			if (input.endsWith(".pdf")) return pdfResponse();
			if (input.endsWith(".pdfpc")) {
				return new Response('{"pdfpcFormat":2}', {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return notFoundResponse();
		}) as unknown as typeof fetch;

		const result = await fetchPdfFromUrl("https://example.com/foo.pdf", {
			fetchImpl,
		});
		expect(result.pdfpc).toBeDefined();
		expect(result.pdfpc?.name).toBe("foo.pdfpc");
	});

	it("無効な URL は invalid-url エラー", async () => {
		await expect(fetchPdfFromUrl("not a url")).rejects.toMatchObject({
			kind: "invalid-url",
		});
	});

	it("非 http(s) スキームは invalid-url エラー", async () => {
		await expect(fetchPdfFromUrl("file:///tmp/a.pdf")).rejects.toMatchObject({
			kind: "invalid-url",
		});
	});

	it("fetch が TypeError で失敗すると cors-or-network エラー", async () => {
		const fetchImpl = vi.fn(async () => {
			throw new TypeError("Failed to fetch");
		}) as unknown as typeof fetch;

		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect(err).toBeInstanceOf(FetchPdfError);
		expect((err as FetchPdfError).kind).toBe("cors-or-network");
	});

	it("非 200 レスポンスは http-error", async () => {
		const fetchImpl = vi.fn(async () =>
			notFoundResponse(),
		) as unknown as typeof fetch;
		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("http-error");
		expect((err as FetchPdfError).status).toBe(404);
	});

	it("PDF マジックバイトが無いと not-pdf エラー", async () => {
		const fetchImpl = vi.fn(
			async () =>
				new Response("<html>not pdf</html>", {
					status: 200,
					headers: { "Content-Type": "text/html" },
				}),
		) as unknown as typeof fetch;
		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("not-pdf");
	});

	it("AbortSignal で aborted エラーになる", async () => {
		const fetchImpl = vi.fn(async (_input: string, init?: RequestInit) => {
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					const err = new DOMException("aborted", "AbortError");
					reject(err);
				});
			});
		}) as unknown as typeof fetch;

		const ac = new AbortController();
		const promise = fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
			signal: ac.signal,
		});
		ac.abort();
		const err = await promise.then(() => null).catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("aborted");
	});

	it("pdfpcUrl オプション指定時はそれを優先し pdf 名に揃える", async () => {
		const fetchImpl = vi.fn(async (input: string) => {
			if (input === "https://example.com/slides.pdf") return pdfResponse();
			if (input === "https://other.example/conf.pdfpc") {
				return new Response('{"pdfpcFormat":2}', {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return notFoundResponse();
		}) as unknown as typeof fetch;

		const result = await fetchPdfFromUrl("https://example.com/slides.pdf", {
			fetchImpl,
			pdfpcUrl: "https://other.example/conf.pdfpc",
		});
		expect(result.pdfpc?.name).toBe("slides.pdfpc");
	});

	it("pdfpcUrl 指定時に取得失敗するとエラーを投げる", async () => {
		const fetchImpl = vi.fn(async (input: string) => {
			if (input.endsWith(".pdf")) return pdfResponse();
			return notFoundResponse();
		}) as unknown as typeof fetch;

		const err = await fetchPdfFromUrl("https://example.com/a.pdf", {
			fetchImpl,
			pdfpcUrl: "https://example.com/missing.pdfpc",
		})
			.then(() => null)
			.catch((e: unknown) => e);
		expect((err as FetchPdfError).kind).toBe("http-error");
	});

	it("URL 末尾が .pdf でなければファイル名に .pdf を補う", async () => {
		const fetchImpl = vi.fn(async () =>
			pdfResponse(),
		) as unknown as typeof fetch;
		const result = await fetchPdfFromUrl("https://example.com/raw/slides", {
			fetchImpl,
		});
		expect(result.pdf.name).toBe("slides.pdf");
	});
});
