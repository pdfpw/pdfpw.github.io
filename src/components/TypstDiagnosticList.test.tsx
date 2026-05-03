import { render } from "vitest-browser-react";
import { describe, expect, it } from "vitest";
import type { TypstDiagnostic } from "#src/lib/typst";
import { TypstDiagnosticList } from "./TypstDiagnosticList";

describe("TypstDiagnosticList", () => {
	it("renders one row per diagnostic with file:line:col and message", async () => {
		const items: TypstDiagnostic[] = [
			{
				severity: "error",
				path: "main.typ",
				line: 12,
				column: 5,
				message: "unknown variable: foo",
			},
			{
				severity: "warning",
				path: "main.typ",
				line: 20,
				column: 1,
				message: "deprecated",
			},
		];
		const screen = await render(<TypstDiagnosticList items={items} />);
		await expect.element(screen.getByText("main.typ:12:5")).toBeVisible();
		await expect
			.element(screen.getByText("unknown variable: foo"))
			.toBeVisible();
		await expect.element(screen.getByText("main.typ:20:1")).toBeVisible();
	});
});
