import { describe, expect, it } from "vitest";
import { containsTypst, pickMainTypst, type TypstSource } from "./typst-source-detect";

const src = (path: string): TypstSource => ({ path, data: new Uint8Array() });

describe("containsTypst", () => {
  it("returns true when any file ends with .typ", () => {
    expect(containsTypst([src("main.typ")])).toBe(true);
    expect(containsTypst([src("a.pdf"), src("b.typ")])).toBe(true);
  });
  it("returns false otherwise", () => {
    expect(containsTypst([src("a.pdf")])).toBe(false);
    expect(containsTypst([])).toBe(false);
  });
});

describe("pickMainTypst", () => {
  it("returns the only .typ when single", () => {
    expect(pickMainTypst([src("hello.typ")])).toBe("hello.typ");
  });
  it("prefers main.typ at root when multiple", () => {
    expect(
      pickMainTypst([src("intro.typ"), src("main.typ"), src("appendix.typ")]),
    ).toBe("main.typ");
  });
  it("falls back to shallowest then alphabetical when no main.typ", () => {
    expect(
      pickMainTypst([
        src("chapters/01.typ"),
        src("chapters/02.typ"),
        src("zoo.typ"),
        src("alpha.typ"),
      ]),
    ).toBe("alpha.typ");
  });
  it("returns null when no .typ", () => {
    expect(pickMainTypst([src("a.pdf")])).toBe(null);
  });
});
