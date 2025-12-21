import type { ClassValue } from "clsx";
import { MaximizeIcon, MinimizeIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "#src/components/ui/button.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";
import { cn } from "#src/lib/utils.ts";

interface MenuProps {
	pdfpcConfig: ResolvedPdfpcConfigV2;
	currentPageNumber: number;
	className?: ClassValue;
}

const HIDE_DELAY_MS = 2500;

export function Menu({ pdfpcConfig, currentPageNumber, className }: MenuProps) {
	const currentSlidePage =
		pdfpcConfig.pages.findIndex((pageGroup) =>
			pageGroup.some(({ pageNumber }) => pageNumber === currentPageNumber),
		) + 1;

	// ここで表示/非表示を制御します
	const [visible, setVisible] = useState<boolean>(true);
	const hideTimerRef = useRef<number | null>(null);

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
		scheduleHide();

		const onPointerMove = (): void => {
			showAndResetTimer();
		};

		// クリック/タップでも表示したい場合
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
	}, []);
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
				"bg-black/50 flex gap-4 py-2 pr-4 pl-6 rounded-xl text-white drop-shadow items-center justify-center",
				"transition-opacity duration-200",
				visible
					? "opacity-100 pointer-events-auto"
					: "opacity-0 pointer-events-none",
				className,
			)}
			onPointerEnter={() => setVisible(true)}
			onPointerLeave={() => scheduleHide()}
		>
			<span>
				{currentSlidePage} / {pdfpcConfig.pages.length}
			</span>
			<Button
				variant={"ghost"}
				type="button"
				size="icon"
				onClick={() => {
					if (document.fullscreenElement) document.exitFullscreen();
					else document.documentElement.requestFullscreen();
				}}
			>
				{isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
			</Button>
		</div>
	);
}
