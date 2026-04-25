import { readFile, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

interface LocaleConfig {
	locale: "en" | "ja";
	lang: string;
	ogLocale: string;
}

const LOCALE_CONFIGS: LocaleConfig[] = [
	{ locale: "en", lang: "en", ogLocale: "en_US" },
	{ locale: "ja", lang: "ja", ogLocale: "ja_JP" },
];

const META = {
	en: {
		title: "PDFPW — Precise PDF presenter",
		description:
			"Browser-based PDF presenter console (pdfpc-compatible). No install, no upload.",
	},
	ja: {
		title: "PDFPW — 精密設計のプレゼンタコンソール",
		description:
			"ブラウザベースの PDF プレゼンテーション・コンソール (pdfpc 互換)。インストール不要、アップロード不要。",
	},
} as const;

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderTemplate(template: string, cfg: LocaleConfig): string {
	const meta = META[cfg.locale];
	return template
		.replaceAll("%LANG%", cfg.lang)
		.replaceAll("%LOCALE%", cfg.locale)
		.replaceAll("%TITLE%", escapeHtml(meta.title))
		.replaceAll("%DESCRIPTION%", escapeHtml(meta.description))
		.replaceAll("%OG_LOCALE%", cfg.ogLocale);
}

export function localeHtmlPlugin(): Plugin {
	const root = process.cwd();
	const generatedDirs: string[] = [];

	return {
		name: "locale-html",
		async config(_config, env) {
			if (env.command !== "build") return;
			const templatePath = resolve(root, "index.template.html");
			const template = await readFile(templatePath, "utf-8");
			for (const cfg of LOCALE_CONFIGS) {
				const dir = resolve(root, cfg.locale);
				await mkdir(dir, { recursive: true });
				await writeFile(
					resolve(dir, "index.html"),
					renderTemplate(template, cfg),
					"utf-8",
				);
				generatedDirs.push(dir);
			}
			return {
				build: {
					rollupOptions: {
						input: {
							root: resolve(root, "index.html"),
							en: resolve(root, "en/index.html"),
							ja: resolve(root, "ja/index.html"),
						},
					},
				},
			};
		},
		async closeBundle() {
			for (const dir of generatedDirs) {
				await rm(dir, { recursive: true, force: true });
			}
		},
		async writeBundle(options) {
			const outDir = options.dir ?? resolve(root, "dist");
			const src = resolve(outDir, "index.html");
			const dest = resolve(outDir, "404.html");
			try {
				await copyFile(src, dest);
			} catch {
				// dist/index.html が無い場合 (rollup エラー等) はスキップ
			}
		},
	};
}
