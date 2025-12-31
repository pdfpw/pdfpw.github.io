type HeroSectionProps = {
	title?: string;
	subtitle?: string;
	status: string | null;
};

export function HeroSection({ status }: HeroSectionProps) {
	return (
		<div className="mx-auto max-w-2xl space-y-8 text-center lg:mx-0 lg:text-left">
			<div className="space-y-4">
				<h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
					PDFPW
				</h1>
				<p className="text-xl font-medium text-muted-foreground">
					Web-based Presentater Tool
				</p>
			</div>
			
			<div className="mx-auto max-w-lg space-y-6 text-lg text-muted-foreground/80 lg:mx-0 leading-relaxed">
				<p>
					LaTeX (Beamer) や Typst (Touying) で生成された{" "}
					<code className="rounded-md bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground">
						.pdfpc
					</code>{" "}
					ファイルをサポート。<br />
					スピーカーノート、タイマー、次スライドプレビューなどの機能を利用できます。
				</p>
			</div>

			{status ? (
				<div className="rounded-xl bg-primary/10 px-6 py-4 text-sm font-medium text-primary animate-in fade-in slide-in-from-bottom-2 border border-primary/20">
					{status}
				</div>
			) : null}
		</div>
	);
}
