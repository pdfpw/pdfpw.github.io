import { useCallback, useEffect, useState } from "react";
import { matchAction } from "#src/lib/keybindings.ts";
import { useLocalStorageSync } from "./use-local-storage-sync.ts";

const HELP_SEEN_KEY = "pdfpw:keybinding-help-seen";

interface KeybindingHelp {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	shouldShowHint: boolean;
	dismissHint: () => void;
}

export function useKeybindingHelp(
	scope: "presenter" | "presentation",
): KeybindingHelp {
	const [isOpen, setIsOpen] = useState(false);
	const [helpSeen, setHelpSeen] = useLocalStorageSync<string>(
		HELP_SEEN_KEY,
		"0",
	);

	const markSeen = useCallback(() => {
		if (helpSeen !== "1") setHelpSeen("1");
	}, [helpSeen, setHelpSeen]);

	const open = useCallback(() => {
		setIsOpen(true);
		markSeen();
	}, [markSeen]);

	const close = useCallback(() => setIsOpen(false), []);

	const dismissHint = useCallback(() => {
		markSeen();
	}, [markSeen]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			const action = matchAction(event, scope);
			if (action !== "system.help") return;
			event.preventDefault();
			setIsOpen((prev) => !prev);
			markSeen();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [scope, markSeen]);

	return {
		isOpen,
		open,
		close,
		shouldShowHint: helpSeen !== "1",
		dismissHint,
	};
}
