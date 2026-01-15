import { type RefObject, useEffect, useEffectEvent, useRef } from "react";

interface NavigationCallbacks {
	// 基本的な移動
	moveNextSlide: () => void;
	movePrevSlide: () => void;
	// 10スライドスキップ
	moveNext10Slides: () => void;
	movePrev10Slides: () => void;
	// 最初/最後のスライドへジャンプ
	jumpToFirstSlide: () => void;
	jumpToLastSlide: () => void;
	// ユーザースライド（オーバーレイグループ）単位の移動
	moveNextUserSlide: () => void;
	movePrevUserSlide: () => void;
	// スライド番号指定ジャンプ
	startJumpToSlide: () => void;
	jumpToSlide?: (slideNumber: number) => void;
	// 履歴を戻る
	goBackInHistory: () => void;
	// オーバービューモードの切り替え
	toggleOverviewMode?: () => void;
	// タイマーリセット
	resetTimer?: () => void;
}

export function useSlideShortcut(
	callbacks: NavigationCallbacks,
	targetRefs: RefObject<HTMLElement | null>[],
) {
	const wheelThreshold = 40;

	// gキーでスライド番号入力モードに入るための状態
	const jumpToSlideModeRef = useRef(false);
	const jumpToSlideBufferRef = useRef("");

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.defaultPrevented) return;

		// スライド番号入力モード中
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
				jumpToSlideBufferRef.current = jumpToSlideBufferRef.current.slice(0, -1);
			}
			return;
		}

		// 通常モード
		switch (event.key) {
			case "ArrowRight":
			case " ":
			case "PageDown":
				event.preventDefault();
				callbacks.moveNextSlide();
				break;
			case "ArrowLeft":
			case "PageUp":
				event.preventDefault();
				callbacks.movePrevSlide();
				break;
			case "ArrowDown":
				// 次のユーザースライド（オーバーレイグループ）へ
				event.preventDefault();
				callbacks.moveNextUserSlide();
				break;
			case "ArrowUp":
				// 前のユーザースライド（オーバーレイグループ）へ
				event.preventDefault();
				callbacks.movePrevUserSlide();
				break;
			case "Home":
				event.preventDefault();
				callbacks.jumpToFirstSlide();
				break;
			case "End":
				event.preventDefault();
				callbacks.jumpToLastSlide();
				break;
			case "Backspace":
				event.preventDefault();
				callbacks.goBackInHistory();
				break;
			case "g":
				event.preventDefault();
				enterJumpToSlideMode();
				break;
			case "Tab":
				event.preventDefault();
				callbacks.toggleOverviewMode?.();
				break;
			case "r":
				event.preventDefault();
				callbacks.resetTimer?.();
				break;
		}

		// Shiftキーとの組み合わせ（10スライドスキップ）
		if (event.shiftKey) {
			if (event.key === "ArrowRight" || event.key === "PageDown") {
				event.preventDefault();
				callbacks.moveNext10Slides();
			} else if (event.key === "ArrowLeft" || event.key === "PageUp") {
				event.preventDefault();
				callbacks.movePrev10Slides();
			}
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

		// 横スクロール(トラックパッド)も拾いたいなら大きい方を採用
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
