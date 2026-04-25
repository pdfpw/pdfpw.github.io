import { FileTextIcon, KeyboardIcon, MonitorPlayIcon } from "lucide-react";

interface Step {
	number: string;
	icon: React.ReactNode;
	title: string;
	body: string;
}

const STEPS: Step[] = [
	{
		number: "01",
		icon: <FileTextIcon className="size-5 text-accent" />,
		title: "Open a PDF in your browser",
		body: "No install, no cloud upload. Your file stays on your device. pdfpc configuration files are supported.",
	},
	{
		number: "02",
		icon: <MonitorPlayIcon className="size-5 text-accent" />,
		title: "Pop out the presentation",
		body: "Two synchronized windows: a private presenter console with notes and timer, plus a public fullscreen display.",
	},
	{
		number: "03",
		icon: <KeyboardIcon className="size-5 text-accent" />,
		title: "Present with confidence",
		body: "Notes, timer, laser pointer, pen, blackout — all keyboard-driven. Stay in flow.",
	},
];

export function HowItWorksSection() {
	return (
		<section className="border-t border-border">
			<div className="container mx-auto max-w-6xl px-6 py-12">
				<div className="mb-6 flex items-baseline justify-between">
					<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						HOW IT WORKS
					</div>
					<div className="text-[11px] text-subtle">3 steps</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{STEPS.map((step) => (
						<article
							key={step.number}
							className="flex flex-col rounded-lg border border-border bg-raised p-5"
						>
							<div className="mb-3 flex items-center justify-between">
								<span className="font-mono text-[11px] font-semibold text-accent">
									{step.number}
								</span>
								{step.icon}
							</div>
							<h3 className="mb-2 text-[15px] font-medium tracking-tight text-fg">
								{step.title}
							</h3>
							<p className="text-[13px] leading-[1.55] text-muted">
								{step.body}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
