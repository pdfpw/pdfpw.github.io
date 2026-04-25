import { XIcon } from "lucide-react";
import { Button } from "#src/components/ui/button.tsx";
import { Kbd } from "#src/components/ui/kbd.tsx";
import * as m from "#src/paraglide/messages.js";

interface Props {
	visible: boolean;
	onDismiss: () => void;
}

export function KeybindingHintToast({ visible, onDismiss }: Props) {
	if (!visible) return null;

	return (
		<output className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-overlay/95 backdrop-blur-md px-3 py-2 text-fg shadow-[var(--shadow-lg)]">
			<span className="text-sm">
				{m.kb_hint_prefix()} <Kbd className="mx-1">?</Kbd> {m.kb_hint_suffix()}
			</span>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onDismiss}
				aria-label={m.kb_hint_dismiss_aria()}
			>
				<XIcon />
			</Button>
		</output>
	);
}
