import { type RefObject, useEffect, useEffectEvent, useRef } from "react";

export function useSlideShortcut(
	moveNextSlide: () => void,
	movePrevSlide: () => void,
	targetRefs: RefObject<HTMLElement | null>[],
) {
	const wheelThreshold = 40;
	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		switch (event.key) {
			case "ArrowRight":
			case " ":
			case "PageDown":
				event.preventDefault();
				moveNextSlide();
				break;
			case "ArrowLeft":
			case "PageUp":
				event.preventDefault();
				movePrevSlide();
				break;
		}
	});
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

		// 横スクロール(トラックパッド)も拾いたいなら大きい方を採用
		const delta =
			Math.abs(event.deltaX) > Math.abs(event.deltaY)
				? event.deltaX
				: event.deltaY;

		wheelAccumRef.current += delta;

		if (wheelAccumRef.current >= wheelThreshold) {
			wheelAccumRef.current = 0;
			moveNextSlide();
		} else if (wheelAccumRef.current <= -wheelThreshold) {
			wheelAccumRef.current = 0;
			movePrevSlide();
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
