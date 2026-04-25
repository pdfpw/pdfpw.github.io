import { Fragment, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#src/components/ui/dialog.tsx";
import { Kbd } from "#src/components/ui/kbd.tsx";
import {
	type ActionDefinition,
	type ActionId,
	type Category,
	humanizeKey,
	KEYBINDING_CATALOG,
} from "#src/lib/keybindings.ts";
import { cn } from "#src/lib/utils.ts";
import * as m from "#src/paraglide/messages.js";
import {
	kb_category_navigation,
	kb_category_tools,
	kb_category_view,
	kb_category_system,
} from "#src/paraglide/messages.js";

const CATEGORY_LABELS: Record<Category, () => string> = {
	navigation: kb_category_navigation,
	tools: kb_category_tools,
	view: kb_category_view,
	system: kb_category_system,
};

const CATEGORY_ORDER: readonly Category[] = [
	"navigation",
	"tools",
	"view",
	"system",
];

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface ActionRow {
	id: ActionId;
	def: ActionDefinition;
}

export function KeybindingHelpDialog({ open, onOpenChange }: Props) {
	const grouped = useMemo<Record<Category, ActionRow[]>>(() => {
		const result: Record<Category, ActionRow[]> = {
			navigation: [],
			tools: [],
			view: [],
			system: [],
		};
		for (const [id, def] of Object.entries(KEYBINDING_CATALOG)) {
			result[def.category].push({ id: id as ActionId, def });
		}
		return result;
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{m.kb_help_title()}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-5">
					{CATEGORY_ORDER.map((cat) => (
						<section key={cat} className="flex flex-col gap-2">
							<h3 className="text-[11px] font-mono uppercase tracking-wider text-muted">
								{CATEGORY_LABELS[cat]()}
							</h3>
							<ul className="flex flex-col gap-1.5">
								{grouped[cat].map((row) => (
									<ShortcutRow key={row.id} def={row.def} />
								))}
							</ul>
						</section>
					))}
				</div>
				<p className="text-muted text-xs text-center pt-2 border-t border-border">
					{m.kb_help_press_again_prefix()} <Kbd className="mx-1">?</Kbd>{" "}
					{m.kb_help_press_again_suffix_with_esc_prefix()}{" "}
					<Kbd className="mx-1">Esc</Kbd> {m.kb_help_press_again_suffix()}
				</p>
			</DialogContent>
		</Dialog>
	);
}

function ShortcutRow({ def }: { def: ActionDefinition }) {
	return (
		<li className="flex items-center gap-3 text-sm">
			<div className="flex flex-wrap items-center gap-1.5 min-w-[12rem]">
				{def.bindings.map((binding, i) => (
					<Fragment key={`${binding.key}-${i}`}>
						{i > 0 && <span className="text-muted text-xs">/</span>}
						<span className="inline-flex items-center gap-1">
							{binding.shift && <Kbd>Shift</Kbd>}
							{binding.shift && <span className="text-muted text-xs">+</span>}
							{binding.ctrl && <Kbd>Ctrl</Kbd>}
							{binding.ctrl && <span className="text-muted text-xs">+</span>}
							{binding.alt && <Kbd>Alt</Kbd>}
							{binding.alt && <span className="text-muted text-xs">+</span>}
							{binding.meta && <Kbd>Meta</Kbd>}
							{binding.meta && <span className="text-muted text-xs">+</span>}
							<Kbd>{humanizeKey(binding.key)}</Kbd>
						</span>
					</Fragment>
				))}
			</div>
			<div className="flex-1 flex flex-col">
				<span className="text-fg">{def.label()}</span>
				{def.hint && <span className="text-muted text-xs">{def.hint()}</span>}
			</div>
			<ScopeBadges scope={def.scope} />
		</li>
	);
}

function ScopeBadges({
	scope,
}: {
	scope: "presenter" | "presentation" | "both";
}) {
	return (
		<div className="flex items-center gap-1">
			<Badge active={scope === "presenter" || scope === "both"} label="P" />
			<Badge active={scope === "presentation" || scope === "both"} label="A" />
		</div>
	);
}

function Badge({ active, label }: { active: boolean; label: string }) {
	return (
		<span
			role="img"
			className={cn(
				"inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold",
				active
					? "bg-accent-soft text-accent border border-accent-soft"
					: "bg-transparent text-subtle border border-border",
			)}
			aria-label={
				label === "P" ? m.kb_help_scope_presenter_aria() : m.kb_help_scope_presentation_aria()
			}
		>
			{label}
		</span>
	);
}
