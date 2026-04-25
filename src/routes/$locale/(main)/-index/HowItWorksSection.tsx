import { FileTextIcon, KeyboardIcon, MonitorPlayIcon } from "lucide-react";
import * as m from "#src/paraglide/messages.js";

interface Step {
	number: string;
	icon: React.ReactNode;
	title: string;
	body: string;
}

function getSteps(): Step[] {
	return [
		{
			number: "01",
			icon: <FileTextIcon className="size-5 text-accent" />,
			title: m.howitworks_step1_title(),
			body: m.howitworks_step1_body(),
		},
		{
			number: "02",
			icon: <MonitorPlayIcon className="size-5 text-accent" />,
			title: m.howitworks_step2_title(),
			body: m.howitworks_step2_body(),
		},
		{
			number: "03",
			icon: <KeyboardIcon className="size-5 text-accent" />,
			title: m.howitworks_step3_title(),
			body: m.howitworks_step3_body(),
		},
	];
}

export function HowItWorksSection() {
	const steps = getSteps();
	return (
		<section className="border-t border-border">
			<div className="container mx-auto max-w-6xl px-6 py-12">
				<div className="mb-6 flex items-baseline justify-between">
					<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						{m.howitworks_eyebrow()}
					</div>
					<div className="text-[11px] text-subtle">{m.howitworks_steps_count()}</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{steps.map((step) => (
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
