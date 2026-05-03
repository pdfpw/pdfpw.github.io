import { playwright } from "@vitest/browser-playwright";
import { exec } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import { localeHtmlPlugin } from "./src/vite-plugins/locale-html-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { regex } from "arkregex";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const GITHUB_REPO_URL_REGEX = regex(
	"^git\\+https://github\\.com/(?<owner>[\\w-]+)/(?<repo>[\\w.-]+)\\.git$",
);

// https://vitejs.dev/config/
export default defineConfig({
	base: "/",
	plugins: [
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/paraglide",
			strategy: ["url", "localStorage", "preferredLanguage", "baseLocale"],
			emitTsDeclarations: true,
		}),
		localeHtmlPlugin(),
		UnpluginTypia(),
		devtools(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		viteReact({
			babel: {
				plugins: process.env.VITEST ? [] : ["babel-plugin-react-compiler"],
			},
		}),
		tailwindcss(),
		{
			name: "colllect-license-info",
			resolveId: {
				filter: { id: /^virtual:licenses-info$/g },
				handler(source) {
					if (source === "virtual:licenses-info") {
						return {
							id: `virtual:licenses-info\0`,
						};
					}
					return null;
				},
			},
			load: {
				filter: { id: /^virtual:licenses-info\0$/g },
				async handler(id) {
					if (id === "virtual:licenses-info\0") {
						const lisenses = await new Promise<Record<string, PnpmLicense[]>>(
							(resolve, reject) => {
								exec(
									"pnpm licenses list --json -P --no-optional",
									(error, stdout) => {
										if (error) {
											reject(error);
											return;
										}
										resolve(JSON.parse(stdout));
									},
								);
							},
						);
						return `export default ${JSON.stringify(
							Object.fromEntries(
								await Promise.all(
									Object.entries(lisenses).map(
										async ([license, packageInfos]) =>
											[
												license,
												await Promise.all(
													packageInfos.map(
														async ({ paths, ...packageInfo }) => {
															for (const path of paths.toReversed()) {
																const files = await readdir(path);
																const licenseFile = files.find((f) =>
																	f.toUpperCase().startsWith("LICENSE"),
																);
																if (licenseFile) {
																	const licenseText = await readFile(
																		`${path}/${licenseFile}`,
																		"utf-8",
																	);
																	packageInfo.licenseText = licenseText;
																	break;
																}
															}
															if (!packageInfo.licenseText) {
																const packageJson = await readFile(
																	`${paths.at(-1)}/package.json`,
																	"utf-8",
																);
																const packageData = JSON.parse(packageJson);
																const repoMatch = GITHUB_REPO_URL_REGEX.exec(
																	packageData.repository?.url ?? "",
																);

																if (!repoMatch) {
																	console.warn(
																		`License file not found for package ${packageInfo.name}. Repo URL not found or invalid.`,
																	);
																	packageInfo.licenseText =
																		"License text not found.";
																	return packageInfo;
																}
																const { owner, repo } = repoMatch.groups;
																for (const licenseUrl of [
																	`https://raw.githubusercontent.com/${owner}/${repo}/main/LICENSE`,
																	`https://raw.githubusercontent.com/${owner}/${repo}/main/LICENSE.md`,
																	`https://raw.githubusercontent.com/${owner}/${repo}/main/LICENSE.txt`,
																	`https://raw.githubusercontent.com/${owner}/${repo}/master/LICENSE`,
																	`https://raw.githubusercontent.com/${owner}/${repo}/master/LICENSE.md`,
																	`https://raw.githubusercontent.com/${owner}/${repo}/master/LICENSE.txt`,
																]) {
																	const response = await fetch(licenseUrl);
																	if (response.ok) {
																		const licenseText = await response.text();
																		packageInfo.licenseText = licenseText;
																		break;
																	}
																}

																if (!packageInfo.licenseText) {
																	console.warn(
																		`License file not found for package ${packageInfo.name}. Checked GitHub paths.`,
																	);
																	packageInfo.licenseText =
																		"License text not found.";
																}
															}

															return packageInfo;
														},
													),
												),
											] as const,
									),
								),
							),
						)};`;
					}
				},
			},
		},
		VitePWA({
			registerType: "prompt",
			injectRegister: null,
			includeAssets: [
				"favicon.ico",
				"icon.svg",
				"robots.txt",
				"logo192.png",
				"logo512.png",
				"icon-maskable.png",
				"apple-touch-icon.png",
				"og-image.png",
			],
			manifest: {
				name: "pdfpw",
				short_name: "pdfpw",
				description: "Browser-based PDF presenter console (pdfpc-compatible).",
				start_url: "/",
				scope: "/",
				display: "standalone",
				orientation: "any",
				theme_color: "#0B0B0F",
				background_color: "#0B0B0F",
				icons: [
					{
						src: "/favicon.ico",
						sizes: "32x32 16x16",
						type: "image/x-icon",
					},
					{
						src: "/logo192.png",
						type: "image/png",
						sizes: "192x192",
						purpose: "any",
					},
					{
						src: "/logo512.png",
						type: "image/png",
						sizes: "512x512",
						purpose: "any",
					},
					{
						src: "/icon-maskable.png",
						type: "image/png",
						sizes: "512x512",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,wasm,mjs}"],
				globIgnores: ["**/typst_ts_web_compiler_bg-*.wasm"],
				navigateFallback: "/index.html",
				cleanupOutdatedCaches: true,
				clientsClaim: false,
				skipWaiting: false,
			},
			devOptions: { enabled: false },
		}),
	],
	optimizeDeps: {
		include: ["@myriaddreamin/typst.ts"],
	},
	worker: {
		format: "es",
	},
	test: {
		globals: true,
		setupFiles: ["./src/test-setup.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }, { browser: "firefox" }],
		},
	},
});

interface PnpmLicense {
	name: string;
	versions: string[];
	paths: string[];
	license: string;
	homepage?: string;
	description?: string;
	author?: string;
	licenseText?: string;
}
