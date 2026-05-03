import { FileIcon, LinkIcon, PlayIcon, PlusIcon } from "lucide-react";
import { type DragEvent, useId, useRef, useState } from "react";
import type React from "react";
import { Button } from "#src/components/ui/button";
import { cn } from "#src/lib/utils";
import * as m from "#src/paraglide/messages.js";

type FsEntry = {
	isFile: boolean;
	isDirectory: boolean;
	name: string;
	file?: (cb: (f: File) => void, err?: (e: unknown) => void) => void;
	createReader?: () => {
		readEntries: (cb: (entries: FsEntry[]) => void, err?: (e: unknown) => void) => void;
	};
};

async function expandDroppedItems(list: DataTransferItemList): Promise<File[]> {
	const entries: FsEntry[] = [];
	for (const it of Array.from(list)) {
		const getEntry = (it as DataTransferItem & {
			webkitGetAsEntry?: () => FsEntry | null;
		}).webkitGetAsEntry;
		if (typeof getEntry === "function") {
			const e = getEntry.call(it);
			if (e) entries.push(e);
		}
	}
	if (entries.length === 0) return [];

	const out: File[] = [];
	async function walk(entry: FsEntry, prefix: string): Promise<void> {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isFile && entry.file) {
			const file: File = await new Promise((res, rej) => entry.file!(res, rej));
			Object.defineProperty(file, "webkitRelativePath", { value: path });
			out.push(file);
			return;
		}
		if (entry.isDirectory && entry.createReader) {
			const reader = entry.createReader();
			let batch: FsEntry[] = [];
			do {
				batch = await new Promise<FsEntry[]>((res, rej) => reader.readEntries(res, rej));
				for (const c of batch) await walk(c, path);
			} while (batch.length > 0);
		}
	}
	for (const e of entries) await walk(e, "");
	return out;
}

const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);

const DEMO_BASE =
	"https://raw.githubusercontent.com/pdfpw/pdfpw.github.io/main/demo";

function demoUrls(locale: string): { pdf: string; pdfpc: string } {
	const stem = locale === "ja" ? "pdfpw-demo.ja" : "pdfpw-demo";
	// Only the English demo ships its own .pdfpc; fall back for ja → use base demo pdfpc
	const pdfpcStem = "pdfpw-demo";
	return {
		pdf: `${DEMO_BASE}/${stem}.pdf`,
		pdfpc: `${DEMO_BASE}/${pdfpcStem}.pdfpc`,
	};
}

interface HeroSectionProps {
	status: React.ReactNode | null;
	inputId: string;
	supportsFSA: boolean;
	locale: string;
	onOpenPicker: () => void;
	onFilesSelected: (files: File[]) => void | Promise<void>;
	onUrlSubmit: (pdfUrl: string, pdfpcUrl?: string) => void | Promise<void>;
}

export function HeroSection({
	status,
	inputId,
	supportsFSA,
	locale,
	onOpenPicker,
	onFilesSelected,
	onUrlSubmit,
}: HeroSectionProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragActive, setDragActive] = useState(false);
	const [urlMode, setUrlMode] = useState(false);
	const [pdfUrlValue, setPdfUrlValue] = useState("");
	const [pdfpcUrlValue, setPdfpcUrlValue] = useState("");
	const urlFormId = useId();

	async function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setDragActive(false);
		const items = event.dataTransfer.items;
		const supportsEntries =
			items != null &&
			Array.from(items).some(
				(it) =>
					typeof (it as DataTransferItem & { webkitGetAsEntry?: unknown })
						.webkitGetAsEntry === "function",
			);
		const files = supportsEntries
			? await expandDroppedItems(items)
			: Array.from(event.dataTransfer.files);
		if (files.length > 0) void onFilesSelected(files);
	}

	function handleDragOver(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		if (!dragActive) setDragActive(true);
	}

	function handleDragLeave() {
		setDragActive(false);
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = event.target.files ? Array.from(event.target.files) : [];
		if (files.length > 0) void onFilesSelected(files);
		event.target.value = "";
	}

	function handleUrlSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const pdf = pdfUrlValue.trim();
		if (!pdf) return;
		const pdfpc = pdfpcUrlValue.trim();
		void onUrlSubmit(pdf, pdfpc || undefined);
		setUrlMode(false);
		setPdfUrlValue("");
		setPdfpcUrlValue("");
	}

	function handleDemoClick() {
		const { pdf, pdfpc } = demoUrls(locale);
		void onUrlSubmit(pdf, pdfpc);
	}

	return (
		<section className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
			<div className="flex flex-col justify-center">
				<h1 className="mb-5 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl lg:text-[56px]">
					{m.hero_headline_line1()}
					<br />
					{m.hero_headline_line2()}
				</h1>
				<p className="mb-8 max-w-[42ch] text-[13px] leading-[1.6] text-muted">
					{m.hero_lead()}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="default"
						size="default"
						onClick={() => inputRef.current?.click()}
					>
						<PlusIcon className="size-4" />
						{m.hero_open_pdf()}
					</Button>
					{supportsFSA && (
						<Button
							type="button"
							variant="secondary"
							size="default"
							onClick={onOpenPicker}
						>
							{m.hero_open_with_fsa()}
						</Button>
					)}
					<Button
						type="button"
						variant="secondary"
						size="default"
						onClick={() => setUrlMode((prev) => !prev)}
						aria-expanded={urlMode}
						aria-controls={urlFormId}
					>
						<LinkIcon className="size-4" />
						{m.hero_open_from_url()}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="default"
						onClick={handleDemoClick}
					>
						<PlayIcon className="size-4" />
						{m.hero_demo_label()}
					</Button>
				</div>
				{urlMode && (
					<form
						id={urlFormId}
						onSubmit={handleUrlSubmit}
						className="mt-4 flex flex-col gap-3"
					>
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${urlFormId}-pdf`}
								className="text-[12px] font-medium text-muted"
							>
								{m.hero_url_input_label()}
							</label>
							<input
								id={`${urlFormId}-pdf`}
								type="url"
								inputMode="url"
								// biome-ignore lint/a11y/noAutofocus: form is revealed by user action
								autoFocus
								required
								placeholder={m.hero_url_input_placeholder()}
								value={pdfUrlValue}
								onChange={(e) => setPdfUrlValue(e.target.value)}
								className="rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label
								htmlFor={`${urlFormId}-pdfpc`}
								className="text-[12px] font-medium text-muted"
							>
								{m.hero_url_pdfpc_label()}
							</label>
							<input
								id={`${urlFormId}-pdfpc`}
								type="url"
								inputMode="url"
								placeholder={m.hero_url_pdfpc_placeholder()}
								value={pdfpcUrlValue}
								onChange={(e) => setPdfpcUrlValue(e.target.value)}
								className="rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button type="submit" variant="default" size="default">
								{m.hero_url_submit()}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="default"
								onClick={() => {
									setUrlMode(false);
									setPdfUrlValue("");
									setPdfpcUrlValue("");
								}}
							>
								{m.hero_url_cancel()}
							</Button>
						</div>
						<p className="text-[11px] text-muted">{m.hero_url_hint()}</p>
					</form>
				)}
				{status !== null && status !== undefined && status !== false && (
					<div className="mt-6 text-[12px] text-muted">{status}</div>
				)}
			</div>

			<label
				htmlFor={inputId}
				onDrop={(e) => void handleDrop(e)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={cn(
					"group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
					dragActive
						? "border-accent bg-accent-soft"
						: "border-accent/50 bg-accent-soft/60 hover:bg-accent-soft",
				)}
			>
				<span
					aria-hidden
					className="flex size-12 items-center justify-center rounded-lg border border-dashed border-accent/70 text-accent"
				>
					<FileIcon className="size-5" />
				</span>
				<span className="text-[13px] font-medium text-accent">
					{m.hero_drop_label()}
				</span>
				<span className="font-mono text-[11px] text-muted">
					{m.hero_drop_hint_browse()} &middot;{" "}
					<kbd>{isMac ? "⌘O" : "Ctrl+O"}</kbd>
				</span>
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept=".pdf,.pdfpc,.typ,application/pdf,application/json"
					multiple
					onChange={handleFileChange}
					className="sr-only"
				/>
			</label>
		</section>
	);
}
