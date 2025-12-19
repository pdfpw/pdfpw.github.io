import { Card } from "../../components/ui/card";

type HeroSectionProps = {
	title: string;
	subtitle: string;
	status: string | null;
};

export function HeroSection({ title, subtitle, status }: HeroSectionProps) {
	return (
		<div className="max-w-2xl space-y-4">
			<h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
				{title}
			</h1>
			<p className="text-lg text-muted-foreground">{subtitle}</p>
			<div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
				<Card className="bg-card/80 p-4 shadow-sm gap-2">
					<p className="font-semibold text-foreground">基本</p>
					<ul className="mt-2 space-y-1">
						<li>・ドラッグ＆ドロップ／ファイル選択でPDFを開く</li>
						<li>・選択後は Speaker へリダイレクト</li>
					</ul>
				</Card>
				<Card className="bg-card/80 p-4 shadow-sm gap-2">
					<p className="font-semibold text-foreground">
						File System Access 対応
					</p>
					<ul className="mt-2 space-y-1">
						<li>・最近開いたファイルを10件まで表示</li>
						<li>・クリックで即起動／履歴から削除可</li>
					</ul>
				</Card>
			</div>
			{status ? (
				<p className="text-sm font-medium text-primary">{status}</p>
			) : null}
		</div>
	);
}
