export type ActionId =
	// navigation
	| "slide.next"
	| "slide.prev"
	| "slide.next-user"
	| "slide.prev-user"
	| "slide.next-10"
	| "slide.prev-10"
	| "slide.first"
	| "slide.last"
	| "slide.history-back"
	| "slide.jump-mode"
	// tools
	| "tool.laser"
	| "tool.pen"
	| "tool.erase"
	| "tool.exit"
	// view
	| "view.overview"
	| "view.fullscreen"
	// system
	| "system.reset-timer"
	| "system.help";

export type Scope = "presenter" | "presentation" | "both";
export type Category = "navigation" | "tools" | "view" | "system";

export interface Binding {
	/** KeyboardEvent.key の値 (単一文字キーは小文字で記述) */
	readonly key: string;
	readonly shift?: boolean;
	readonly ctrl?: boolean;
	readonly alt?: boolean;
	readonly meta?: boolean;
}

export interface ActionDefinition {
	readonly category: Category;
	readonly scope: Scope;
	readonly bindings: readonly Binding[];
	readonly label: string;
	readonly hint?: string;
}

export const KEYBINDING_CATALOG: Record<ActionId, ActionDefinition> = {
	// navigation
	"slide.next-10": {
		category: "navigation",
		scope: "presenter",
		bindings: [
			{ key: "ArrowRight", shift: true },
			{ key: "PageDown", shift: true },
		],
		label: "Skip 10 forward",
	},
	"slide.prev-10": {
		category: "navigation",
		scope: "presenter",
		bindings: [
			{ key: "ArrowLeft", shift: true },
			{ key: "PageUp", shift: true },
		],
		label: "Skip 10 backward",
	},
	"slide.next": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "ArrowRight" }, { key: " " }, { key: "PageDown" }],
		label: "Next slide",
	},
	"slide.prev": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "ArrowLeft" }, { key: "PageUp" }],
		label: "Previous slide",
	},
	"slide.next-user": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "ArrowDown" }],
		label: "Next slide group",
	},
	"slide.prev-user": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "ArrowUp" }],
		label: "Previous slide group",
	},
	"slide.first": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "Home" }],
		label: "First slide",
	},
	"slide.last": {
		category: "navigation",
		scope: "both",
		bindings: [{ key: "End" }],
		label: "Last slide",
	},
	"slide.history-back": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "Backspace" }],
		label: "Navigate back in history",
	},
	"slide.jump-mode": {
		category: "navigation",
		scope: "presenter",
		bindings: [{ key: "g" }],
		label: "Jump to slide N",
		hint: "Then type digits and press Enter",
	},
	// tools
	"tool.laser": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "l" }],
		label: "Toggle laser pointer",
	},
	"tool.pen": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "d" }],
		label: "Toggle pen",
	},
	"tool.erase": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "e" }],
		label: "Erase pen drawings",
	},
	"tool.exit": {
		category: "tools",
		scope: "both",
		bindings: [{ key: "Escape" }],
		label: "Exit tool / close dialog",
	},
	// view
	"view.overview": {
		category: "view",
		scope: "both",
		bindings: [{ key: "Tab" }],
		label: "Toggle overview",
	},
	"view.fullscreen": {
		category: "view",
		scope: "presentation",
		bindings: [{ key: "f" }],
		label: "Toggle fullscreen",
	},
	// system
	"system.reset-timer": {
		category: "system",
		scope: "presenter",
		bindings: [{ key: "r" }],
		label: "Reset timer",
	},
	"system.help": {
		category: "system",
		scope: "both",
		bindings: [{ key: "?", shift: true }, { key: "F1" }],
		label: "Show keyboard help",
	},
};

/**
 * Compare a `KeyboardEvent` against a single `Binding`.
 *
 * Exported for unit testing. Prefer `matchAction` as the public API for resolving
 * events to actions.
 */
export function matchBinding(event: KeyboardEvent, binding: Binding): boolean {
	const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	const bindingKey =
		binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
	if (eventKey !== bindingKey) return false;
	if (!!binding.shift !== event.shiftKey) return false;
	if (!!binding.ctrl !== event.ctrlKey) return false;
	if (!!binding.alt !== event.altKey) return false;
	if (!!binding.meta !== event.metaKey) return false;
	return true;
}

/**
 * Resolve a `KeyboardEvent` to an `ActionId` by scanning `KEYBINDING_CATALOG`.
 * Entries whose `scope` is `"both"` match regardless of the query scope.
 *
 * NOTE: `scope` must be `"presenter"` or `"presentation"` (not `"both"`) — the
 * query represents the screen the key was pressed on, and `"both"` is a catalog
 * classification, not a meaningful query value.
 */
export function matchAction(
	event: KeyboardEvent,
	scope: "presenter" | "presentation",
): ActionId | null {
	for (const [actionId, def] of Object.entries(KEYBINDING_CATALOG)) {
		if (def.scope !== "both" && def.scope !== scope) continue;
		for (const binding of def.bindings) {
			if (matchBinding(event, binding)) return actionId as ActionId;
		}
	}
	return null;
}

const HUMAN_KEY_MAP: Record<string, string> = {
	ArrowRight: "→",
	ArrowLeft: "←",
	ArrowUp: "↑",
	ArrowDown: "↓",
	" ": "Space",
	PageDown: "PgDn",
	PageUp: "PgUp",
	Escape: "Esc",
};

export function humanizeKey(key: string): string {
	if (key in HUMAN_KEY_MAP) return HUMAN_KEY_MAP[key];
	if (key.length === 1) return key.toUpperCase();
	return key;
}
