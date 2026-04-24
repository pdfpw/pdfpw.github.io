import { FileIcon, PlusIcon } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { Button } from "#src/components/ui/button";
import { cn } from "#src/lib/utils";

interface HeroSectionProps {
	status: string | null;
	inputId: string;
	supportsFSA: boolean;
	onOpenPicker: () => void;
	onFilesSelected: (files: File[]) => void | Promise<void>;
}

export function HeroSection({
	status,
	inputId,
	supportsFSA,
	onOpenPicker,
	onFilesSelected,
}: HeroSectionProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragActive, setDragActive] = useState(false);

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setDragActive(false);
		const files = Array.from(event.dataTransfer.files);
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

	return (
		<section className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
			<div className="flex flex-col justify-center">
				<div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
					PRESENTER CONSOLE / 001
				</div>
				<h1 className="mb-5 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl lg:text-[56px]">
					Precise by
					<br />
					default.
				</h1>
				<p className="mb-8 max-w-[42ch] text-[13px] leading-[1.6] text-muted">
					A browser-based presenter console. No install, no cloud upload. Your
					PDF stays on your device.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="default"
						size="default"
						onClick={() => inputRef.current?.click()}
					>
						<PlusIcon className="size-4" />
						Open PDF
					</Button>
					{supportsFSA && (
						<Button
							type="button"
							variant="secondary"
							size="default"
							onClick={onOpenPicker}
						>
							Open with File System Access
						</Button>
					)}
				</div>
				{status && (
					<output className="mt-6 text-[12px] text-muted">{status}</output>
				)}
			</div>

			<label
				htmlFor={inputId}
				onDrop={handleDrop}
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
					Drop a PDF here
				</span>
				<span className="font-mono text-[11px] text-muted">
					or click to browse &middot; <kbd>⌘O</kbd>
				</span>
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept=".pdf,.pdfpc,application/pdf,application/json"
					multiple
					onChange={handleFileChange}
					className="sr-only"
				/>
			</label>
		</section>
	);
}
