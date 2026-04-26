// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "mock-worker.js" }));
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));

import * as pdfjs from "pdfjs-dist";
import { generateThumbnail } from "./thumbnail.ts";

describe("generateThumbnail", () => {
  const mockGetDocument = vi.mocked(pdfjs.getDocument);

  beforeEach(() => {
    const mockRender = vi.fn(() => ({ promise: Promise.resolve() }));
    const mockGetViewport = vi.fn((opts?: { scale?: number }) => ({
      width: 800 * (opts?.scale ?? 1),
      height: 600 * (opts?.scale ?? 1),
    }));
    const mockPage = {
      getViewport: mockGetViewport,
      render: mockRender,
    };
    const mockPdfProxy = {
      getPage: vi.fn(() => Promise.resolve(mockPage)),
      destroy: vi.fn(() => Promise.resolve()),
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
    mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockPdfProxy) } as any);

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
      {} as any,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/jpeg;base64,abc",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PDFの1ページ目のJPEG data URLを返す", async () => {
    const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const result = await generateThumbnail(file);
    expect(result).toBe("data:image/jpeg;base64,abc");
    expect(mockGetDocument).toHaveBeenCalled();
    // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
    const proxy = await (mockGetDocument.mock.results[0].value as any).promise;
    expect(proxy.getPage).toHaveBeenCalledWith(1);
  });

  it("getContext が null を返す場合は null を返す", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const result = await generateThumbnail(file);
    expect(result).toBeNull();
  });

  it("PDF ロードエラー時は null を返す", async () => {
    mockGetDocument.mockImplementation(() => ({
      // Promise.reject を即時生成すると unhandled rejection になるため、lazy に生成する
      get promise() {
        return Promise.reject(new Error("load error"));
      },
      // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
    }) as any);
    const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const result = await generateThumbnail(file);
    expect(result).toBeNull();
  });
});
