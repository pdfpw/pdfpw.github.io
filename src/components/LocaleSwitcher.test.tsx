import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocaleSwitcher } from "./LocaleSwitcher.tsx";

function setupRouter(initialPath: string) {
	const rootRoute = createRootRoute({ component: () => <Outlet /> });
	const localeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/$locale",
		component: () => (
			<>
				<LocaleSwitcher />
				<Outlet />
			</>
		),
	});
	const indexRoute = createRoute({
		getParentRoute: () => localeRoute,
		path: "/",
		component: () => <div>home</div>,
	});
	const presenterRoute = createRoute({
		getParentRoute: () => localeRoute,
		path: "/presenter",
		component: () => <div>presenter</div>,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([
			localeRoute.addChildren([indexRoute, presenterRoute]),
		]),
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	return router;
}

describe("LocaleSwitcher", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => localStorage.clear());

	it("現在 locale ボタンに aria-pressed='true' が付く", async () => {
		const router = setupRouter("/en");
		const screen = await render(<RouterProvider router={router} />);
		const enBtn = screen.getByRole("button", { name: /english/i });
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		await expect.element(enBtn).toHaveAttribute("aria-pressed", "true");
		await expect.element(jaBtn).toHaveAttribute("aria-pressed", "false");
	});

	it("ja ボタンクリックで /ja に navigate し localStorage が更新される", async () => {
		const router = setupRouter("/en");
		const screen = await render(<RouterProvider router={router} />);
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		await jaBtn.click();
		await router.invalidate();
		expect(router.state.location.pathname.startsWith("/ja")).toBe(true);
		expect(localStorage.getItem("pdfpw:locale")).toBe("ja");
	});

	it("locale 切替で query string と hash が維持される", async () => {
		const router = setupRouter("/en/presenter?file=foo.pdf#section1");
		const screen = await render(<RouterProvider router={router} />);
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		await jaBtn.click();
		await router.invalidate();
		expect(router.state.location.pathname).toBe("/ja/presenter");
		expect(router.state.location.searchStr).toBe("?file=foo.pdf");
		expect(router.state.location.hash).toBe("section1");
	});
});
