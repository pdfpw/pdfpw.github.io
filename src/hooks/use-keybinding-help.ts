import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { matchAction } from "#src/lib/keybindings.ts";
import { useLocalStorageSync } from "./use-local-storage-sync.ts";

const HELP_SEEN_KEY = "pdfpw:keybinding-help-seen";

export interface KeybindingHelp {
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

	const markSeen = useEffectEvent(() => {
		if (helpSeen !== "1") setHelpSeen("1");
	});

	const open = useCallback(() => {
		setIsOpen(true);
		markSeen();
	}, []);

	const close = useCallback(() => setIsOpen(false), []);

	const dismissHint = useCallback(() => {
		markSeen();
	}, []);

	const onKey = useEffectEvent((event: KeyboardEvent) => {
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
	});

	useEffect(() => {
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return {
		isOpen,
		open,
		close,
		shouldShowHint: helpSeen !== "1",
		dismissHint,
	};
}
