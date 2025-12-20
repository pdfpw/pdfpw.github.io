import { FolderOpenIcon, HistoryIcon, UploadCloudIcon } from "lucide-react";
import { type DragEvent, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";

type DropzoneSectionProps = {
	inputId: string;
	supportsFSA: boolean;
	onOpenPicker: () => Promise<void> | void;
	onFilesSelected: (files: File[]) => Promise<void>;
};

export function DropzoneSection({
	inputId,
	supportsFSA,
	onOpenPicker,
	onFilesSelected,
}: DropzoneSectionProps) {
	const [dragActive, setDragActive] = useState(false);

	const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		setDragActive(true);
	};

	const handleDragLeave = () => {
		setDragActive(false);
	};

	const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		setDragActive(false);
		const fileList = event.dataTransfer?.files;
		if (!fileList?.length) return;
		await onFilesSelected(Array.from(fileList));
	};

	return (
		<div className="w-full max-w-xl">
			<Card className="rounded-3xl shadow-xl p-0 gap-0">
				<label
					htmlFor={inputId}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={cn(
						"relative m-4 flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary/40 hover:bg-secondary/50",
						dragActive && "border-primary bg-primary/10",
					)}
				>
					<input
						id={inputId}
						type="file"
						accept=".pdf,.pdfpc,application/pdf,application/json"
						className="hidden"
						multiple
						onChange={async (event) => {
							const files = event.target.files;
							if (files?.length) await onFilesSelected(Array.from(files));
						}}
					/>
					<div className="flex flex-col items-center gap-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
							<UploadCloudIcon className="h-8 w-8" />
						</div>
						<div>
							<p className="text-lg font-semibold text-foreground">
								PDFをドロップ
							</p>
							<p className="text-sm text-muted-foreground">
								またはクリックしてファイルを選択
							</p>
						</div>
					</div>
				</label>

				<div className="grid grid-cols-1 gap-3 border-t border-border px-6 py-5 sm:grid-cols-2">
					<Button
						type="button"
						onClick={onOpenPicker}
						disabled={!supportsFSA}
						className="w-full justify-start"
						variant={supportsFSA ? "default" : "outline"}
					>
						<FolderOpenIcon className="h-5 w-5" />
						<span>File System Access で開く</span>
					</Button>
					<a
						className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:-translate-y-px hover:shadow-md"
						href="https://developer.chrome.com/docs/capabilities/web-apis/file-system-access"
						target="_blank"
						rel="noreferrer"
					>
						<HistoryIcon className="h-5 w-5 text-muted-foreground" />
						<span>対応ブラウザと権限の要件</span>
					</a>
				</div>
			</Card>
		</div>
	);
}
