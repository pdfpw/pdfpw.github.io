import type { ClassValue } from "clsx";
import { useAtomValue } from "jotai";
import { KeyboardIcon, MaximizeIcon, MinimizeIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "#src/components/ui/button.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { toolModeAtom } from "#src/lib/pointer-state.ts";
import { cn } from "#src/lib/utils.ts";

interface MenuProps {
	pdfpcConfig: ResolvedPdfpcConfigV2;
	currentPageNumber: number;
	className?: ClassValue;
	onHelpClick?: () => void;
}

const HIDE_DELAY_MS = 2500;

export function Menu({
	pdfpcConfig,
	currentPageNumber,
	className,
	onHelpClick,
}: MenuProps) {
	const currentSlidePage =
		pdfpcConfig.pages.findIndex((pageGroup) =>
			pageGroup.some(({ pageNumber }) => pageNumber === currentPageNumber),
		) + 1;

	// ここで表示/非表示を制御します
	const [visible, setVisible] = useState<boolean>(true);
	const hideTimerRef = useRef<number | null>(null);
	const toolMode = useAtomValue(toolModeAtom);

	const scheduleHide = useEffectEvent((): void => {
		if (hideTimerRef.current) {
			window.clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
		hideTimerRef.current = window.setTimeout(() => {
			setVisible(false);
			hideTimerRef.current = null;
		}, HIDE_DELAY_MS);
	});

	const showAndResetTimer = useEffectEvent((): void => {
		setVisible(true);
		scheduleHide();
	});

	useEffect(() => {
		if (toolMode !== "none") {
			// ツール使用中はメニューを出さない
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
				hideTimerRef.current = null;
			}
			setVisible(false);
			return;
		}

		scheduleHide();

		const onPointerMove = (): void => {
			showAndResetTimer();
		};
		const onPointerDown = (): void => {
			showAndResetTimer();
		};

		window.addEventListener("pointermove", onPointerMove, { passive: true });
		window.addEventListener("pointerdown", onPointerDown, { passive: true });

		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerdown", onPointerDown);
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
				hideTimerRef.current = null;
			}
		};
	}, [toolMode]);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	useEffect(() => {
		const update = (): void => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		update();
		document.addEventListener("fullscreenchange", update);

		return () => {
			document.removeEventListener("fullscreenchange", update);
		};
	}, []);

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-[10px] border border-border bg-overlay/90 px-3 py-2 text-fg shadow-[var(--shadow-lg)] backdrop-blur-md",
				"transition-opacity duration-200",
				visible
					? "opacity-100 pointer-events-auto"
					: "opacity-0 pointer-events-none",
				className,
			)}
			onPointerEnter={() => setVisible(true)}
			onPointerLeave={() => scheduleHide()}
		>
			<span className="font-mono text-[11px] text-fg tabular-nums">
				{currentSlidePage} / {pdfpcConfig.pages.length}
			</span>
			{onHelpClick && (
				<Button
					variant="ghost"
					type="button"
					size="icon-sm"
					onClick={onHelpClick}
					aria-label="Keyboard shortcuts"
				>
					<KeyboardIcon />
				</Button>
			)}
			<Button
				variant="ghost"
				type="button"
				size="icon-sm"
				onClick={() => {
					if (document.fullscreenElement) document.exitFullscreen();
					else document.documentElement.requestFullscreen();
				}}
				aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
			>
				{isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
			</Button>
		</div>
	);
}
