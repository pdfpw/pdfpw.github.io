import { FolderOpenIcon, InfoIcon, UploadCloudIcon } from "lucide-react";
import { type DragEvent, useState } from "react";
import { Button } from "#src/components/ui/button";
import { Card } from "#src/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#src/components/ui/dialog";
import { cn } from "#src/lib/utils";

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
		<Card className="w-full max-w-lg rounded-3xl shadow-xl p-0 gap-0 overflow-hidden bg-card/50 backdrop-blur-sm">
			<label
				htmlFor={inputId}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={cn(
					"relative m-2 flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 p-8 text-center transition hover:border-primary/40 hover:bg-secondary/50",
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
				<div className="flex flex-col items-center gap-4">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
						<UploadCloudIcon className="h-6 w-6" />
					</div>
					<div className="space-y-1">
						<p className="text-lg font-semibold text-foreground">
							PDFをドロップ
						</p>
						<p className="text-sm text-muted-foreground">
							またはクリックしてファイルを選択
						</p>
					</div>
				</div>
			</label>

			<div className="grid grid-cols-1 gap-2 border-t border-border/50 bg-secondary/20 px-4 py-4 sm:grid-cols-2">
				<Button
					type="button"
					onClick={onOpenPicker}
					disabled={!supportsFSA}
					className="w-full justify-start h-10"
					variant={supportsFSA ? "default" : "secondary"}
				>
					<FolderOpenIcon className="h-4 w-4 mr-2" />
					<span>高機能モードで開く (推奨)</span>
				</Button>
				
				<Dialog>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							className="w-full justify-start h-10 gap-2 text-muted-foreground hover:text-foreground"
						>
							<InfoIcon className="h-4 w-4" />
							<span>高機能モードについて</span>
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>高機能モード (File System Access) とは？</DialogTitle>
							<DialogDescription className="space-y-4 pt-4 text-left leading-relaxed">
								<p>
									<strong>高機能モード</strong>では、ブラウザの File System Access API を使用して、
									PC上のファイルを直接読み書きします。
								</p>
								<ul className="list-disc pl-5 space-y-1">
									<li>履歴からすぐにファイルを開き直せます。</li>
									<li>設定ファイル (.pdfpc) やスピーカーノートを自動で保存します。</li>
									<li>ページをリロードするだけで、編集中のPDFの最新状態を再描画できます。</li>
								</ul>
								<p className="text-xs text-muted-foreground pt-2">
									<a
										href="https://developer.chrome.com/docs/capabilities/web-apis/file-system-access"
										target="_blank"
										rel="noreferrer"
										className="underline hover:text-foreground"
									>
										対応ブラウザと権限の要件など、詳細はこちら (Chrome Developers)
									</a>
								</p>
							</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			</div>
		</Card>
	);
}
