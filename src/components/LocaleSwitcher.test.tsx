// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
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
	const router = createRouter({
		routeTree: rootRoute.addChildren([localeRoute.addChildren([indexRoute])]),
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	return router;
}

describe("LocaleSwitcher", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => localStorage.clear());

	it("現在 locale ボタンに aria-pressed='true' が付く", async () => {
		const router = setupRouter("/en");
		render(<RouterProvider router={router} />);
		await screen.findByRole("button", { name: /english/i });
		const enBtn = screen.getByRole("button", { name: /english/i });
		const jaBtn = screen.getByRole("button", { name: /japanese|日本語/i });
		expect(enBtn).toHaveAttribute("aria-pressed", "true");
		expect(jaBtn).toHaveAttribute("aria-pressed", "false");
	});

	it("ja ボタンクリックで /ja に navigate し localStorage が更新される", async () => {
		const router = setupRouter("/en");
		render(<RouterProvider router={router} />);
		const jaBtn = await screen.findByRole("button", {
			name: /japanese|日本語/i,
		});
		fireEvent.click(jaBtn);
		await router.invalidate();
		expect(router.state.location.pathname.startsWith("/ja")).toBe(true);
		expect(localStorage.getItem("pdfpw:locale")).toBe("ja");
	});
});
