import { type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { matchAction } from "#src/lib/keybindings.ts";

interface NavigationCallbacks {
	moveNextSlide: () => void;
	movePrevSlide: () => void;
	moveNext10Slides: () => void;
	movePrev10Slides: () => void;
	jumpToFirstSlide: () => void;
	jumpToLastSlide: () => void;
	moveNextUserSlide: () => void;
	movePrevUserSlide: () => void;
	startJumpToSlide: () => void;
	jumpToSlide?: (slideNumber: number) => void;
	goBackInHistory: () => void;
	toggleOverviewMode?: () => void;
	resetTimer?: () => void;
}

export function useSlideShortcut(
	callbacks: NavigationCallbacks,
	targetRefs: RefObject<HTMLElement | null>[],
) {
	const wheelThreshold = 40;

	const jumpToSlideModeRef = useRef(false);
	const jumpToSlideBufferRef = useRef("");

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		// jump-to-slide モード中は専用処理 (Enter / Esc / 数字 / Backspace / g)
		if (jumpToSlideModeRef.current) {
			if (event.key >= "0" && event.key <= "9") {
				event.preventDefault();
				jumpToSlideBufferRef.current += event.key;
			} else if (event.key === "Enter" || event.key === "g") {
				event.preventDefault();
				const slideNumber = Number.parseInt(jumpToSlideBufferRef.current, 10);
				if (!Number.isNaN(slideNumber) && slideNumber > 0) {
					callbacks.jumpToSlide?.(slideNumber);
				}
				exitJumpToSlideMode();
			} else if (event.key === "Escape") {
				event.preventDefault();
				exitJumpToSlideMode();
			} else if (event.key === "Backspace") {
				event.preventDefault();
				jumpToSlideBufferRef.current = jumpToSlideBufferRef.current.slice(
					0,
					-1,
				);
			}
			return;
		}

		const action = matchAction(event, "presenter");
		if (!action) return;

		switch (action) {
			case "slide.next":
				event.preventDefault();
				callbacks.moveNextSlide();
				break;
			case "slide.prev":
				event.preventDefault();
				callbacks.movePrevSlide();
				break;
			case "slide.next-10":
				event.preventDefault();
				callbacks.moveNext10Slides();
				break;
			case "slide.prev-10":
				event.preventDefault();
				callbacks.movePrev10Slides();
				break;
			case "slide.next-user":
				event.preventDefault();
				callbacks.moveNextUserSlide();
				break;
			case "slide.prev-user":
				event.preventDefault();
				callbacks.movePrevUserSlide();
				break;
			case "slide.first":
				event.preventDefault();
				callbacks.jumpToFirstSlide();
				break;
			case "slide.last":
				event.preventDefault();
				callbacks.jumpToLastSlide();
				break;
			case "slide.history-back":
				event.preventDefault();
				callbacks.goBackInHistory();
				break;
			case "slide.jump-mode":
				event.preventDefault();
				enterJumpToSlideMode();
				break;
			case "view.overview":
				event.preventDefault();
				callbacks.toggleOverviewMode?.();
				break;
			case "system.reset-timer":
				event.preventDefault();
				callbacks.resetTimer?.();
				break;
			// 他の action (tool.* / system.help / view.fullscreen) は別フックで処理
			default:
				break;
		}
	});

	const enterJumpToSlideMode = () => {
		jumpToSlideModeRef.current = true;
		jumpToSlideBufferRef.current = "";
	};

	const exitJumpToSlideMode = () => {
		jumpToSlideModeRef.current = false;
		jumpToSlideBufferRef.current = "";
	};

	const wheelAccumRef = useRef<number>(0);
	const lastWheelTimeRef = useRef<number>(0);

	const handleWheel = useEffectEvent((event: WheelEvent) => {
		if (event.ctrlKey) return;

		event.preventDefault();
		const now = performance.now();
		if (now - lastWheelTimeRef.current > 250) {
			wheelAccumRef.current = 0;
		}
		lastWheelTimeRef.current = now;

		const delta =
			Math.abs(event.deltaX) > Math.abs(event.deltaY)
				? event.deltaX
				: event.deltaY;

		wheelAccumRef.current += delta;

		if (wheelAccumRef.current >= wheelThreshold) {
			wheelAccumRef.current = 0;
			callbacks.moveNextSlide();
		} else if (wheelAccumRef.current <= -wheelThreshold) {
			wheelAccumRef.current = 0;
			callbacks.movePrevSlide();
		}
	});

	useEffect(() => {
		const abortController = new AbortController();
		window.addEventListener("keydown", handleKeyDown, {
			signal: abortController.signal,
		});
		for (const slideStageRef of targetRefs)
			if (slideStageRef.current)
				slideStageRef.current.addEventListener("wheel", handleWheel, {
					signal: abortController.signal,
					passive: false,
				});
		return () => {
			abortController.abort();
		};
	}, [targetRefs]);
}
