import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { Button } from "#src/components/ui/button.tsx";
import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config";
import { cn } from "#src/lib/utils";

interface TimerProps {
	pdfpcConfig?: ResolvedPdfpcConfigV2;
	pageNumber?: number;
}

type TimerColorState =
	| "normal"
	| "pretalk"
	| "too-fast"
	| "too-slow"
	| "overtime";

type TimerSchedule = {
	startTime: Date | null;
	endTime: Date | null;
	durationMs: number;
};

type TimerState = {
	isRunning: boolean;
	hasStarted: boolean;
	startMs: number | null;
	accumulatedMs: number;
	anchorMs: number;
};

type TimerAction =
	| { type: "TOGGLE"; nowMs: number }
	| { type: "RESET"; nowMs: number; hasStartedAfterReset: boolean }
	| { type: "AUTO_START"; nowMs: number };

type TimerView = {
	displayText: string;
	clockText: string;
	timerColorState: TimerColorState;
	isRunning: boolean;
};

const TIMER_PACE_COLOR = true;
const PACE_THRESHOLD_SECONDS = 60;

const durationFormatter = new Intl.DurationFormat("ja-JP", {
	style: "digital",
	hours: "numeric",
	minutes: "2-digit",
	seconds: "2-digit",
});
const clockFormatter = new Intl.DateTimeFormat("ja-JP", {
	hour: "2-digit",
	minute: "2-digit",
});

function truncateToMinute(date: Date): Date {
	const truncated = new Date(date);
	truncated.setSeconds(0, 0);
	return truncated;
}

function parseTimeToDate(anchor: Date, time: string): Date {
	const [hour, minute] = time.split(":").map(Number);
	const out = new Date(anchor);
	out.setHours(hour, minute, 0, 0);
	if (out.getTime() < anchor.getTime()) out.setDate(out.getDate() + 1);
	return out;
}

function resolveTimerSchedule(
	pdfpcConfig: ResolvedPdfpcConfigV2 | undefined,
	anchor: Date,
): TimerSchedule {
	const durationMinutes = pdfpcConfig?.duration ?? 0;
	const startTimeText = pdfpcConfig?.startTime;
	const endTimeText = pdfpcConfig?.endTime;

	const durationMs = Math.max(0, durationMinutes) * 60 * 1000;

	if (!startTimeText && !endTimeText) {
		return { startTime: null, endTime: null, durationMs };
	}

	const baseAnchor = truncateToMinute(anchor);
	let startTime = startTimeText
		? parseTimeToDate(baseAnchor, startTimeText)
		: null;
	let endTime = endTimeText ? parseTimeToDate(baseAnchor, endTimeText) : null;
	let resolvedDurationMs = durationMs;

	if (startTime && endTime && endTimeText) {
		const [endHour, endMinute] = endTimeText.split(":").map(Number);
		const endFromStart = new Date(startTime);
		endFromStart.setHours(endHour, endMinute, 0, 0);
		if (endFromStart.getTime() <= startTime.getTime()) {
			endFromStart.setDate(endFromStart.getDate() + 1);
		}
		endTime = endFromStart;
		resolvedDurationMs = endFromStart.getTime() - startTime.getTime();
	} else if (!startTime && endTime) {
		startTime = new Date(endTime.getTime() - resolvedDurationMs);
	} else if (startTime && !endTime && resolvedDurationMs > 0) {
		endTime = new Date(startTime.getTime() + resolvedDurationMs);
	}

	return {
		startTime,
		endTime,
		durationMs: resolvedDurationMs,
	};
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(Math.abs(ms) / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return durationFormatter.format({
		hours: ms < 0 ? -hours : hours,
		minutes,
		seconds,
	});
}

function getCurrentSlideIndex(
	pdfpcConfig: ResolvedPdfpcConfigV2 | undefined,
	pageNumber: number,
): number {
	if (!pdfpcConfig) return 0;
	const index = pdfpcConfig.pages.findIndex((pageGroup) =>
		pageGroup.some((page) => page.pageNumber === pageNumber),
	);
	return index === -1 ? 0 : index;
}

function resolveTimerColorState(
	isPreTalk: boolean,
	durationMs: number,
	talkTimeMs: number,
	expectedTimeSeconds: number,
	talkTimeSeconds: number,
): TimerColorState {
	if (isPreTalk) return "pretalk";
	if (durationMs > 0) {
		if (talkTimeMs >= durationMs) return "overtime";
		if (TIMER_PACE_COLOR) {
			if (talkTimeSeconds > expectedTimeSeconds + PACE_THRESHOLD_SECONDS)
				return "too-slow";
			if (talkTimeSeconds < expectedTimeSeconds - PACE_THRESHOLD_SECONDS)
				return "too-fast";
		}
	}
	return "normal";
}

function useNowMs(intervalMs: number = 1000): number {
	const [nowMs, setNowMs] = useState<number>(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(() => setNowMs(Date.now()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs]);
	return nowMs;
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
	switch (action.type) {
		case "TOGGLE": {
			const nowMs = action.nowMs;

			if (state.isRunning) {
				const add = state.startMs === null ? 0 : nowMs - state.startMs;
				return {
					...state,
					isRunning: false,
					startMs: null,
					accumulatedMs: state.accumulatedMs + add,
				};
			}

			if (!state.hasStarted) {
				return {
					...state,
					hasStarted: true,
					isRunning: true,
					startMs: nowMs,
					anchorMs: nowMs,
				};
			}

			return {
				...state,
				isRunning: true,
				startMs: nowMs,
			};
		}

		case "AUTO_START": {
			if (state.hasStarted) return state;
			const nowMs = action.nowMs;
			return {
				...state,
				hasStarted: true,
				isRunning: true,
				startMs: nowMs,
				anchorMs: nowMs,
			};
		}

		case "RESET": {
			return {
				isRunning: false,
				accumulatedMs: 0,
				startMs: null,
				anchorMs: action.nowMs,
				hasStarted: action.hasStartedAfterReset,
			};
		}

		default: {
			return state;
		}
	}
}

function calcElapsedMs(state: TimerState, nowMs: number): number {
	if (state.isRunning && state.startMs !== null) {
		return state.accumulatedMs + (nowMs - state.startMs);
	}
	return state.accumulatedMs;
}

function calcTiming(
	nowMs: number,
	elapsedMs: number,
	isTimerStarted: boolean,
	schedule: TimerSchedule,
): {
	talkTimeMs: number;
	isPreTalk: boolean;
	durationMs: number;
	displayMs: number;
} {
	const rawTalkTimeMs =
		isTimerStarted && schedule.startTime
			? nowMs - schedule.startTime.getTime()
			: elapsedMs;

	const talkTimeMs = Math.max(0, rawTalkTimeMs);

	const isPreTalk =
		isTimerStarted &&
		schedule.startTime !== null &&
		nowMs < schedule.startTime.getTime();

	const durationMs = schedule.durationMs;
	const isCountDown = durationMs > 0;

	const displayMs = isPreTalk
		? -(schedule.startTime!.getTime() - nowMs)
		: isCountDown
			? durationMs - talkTimeMs
			: talkTimeMs;

	return { talkTimeMs, isPreTalk, durationMs, displayMs };
}

function calcPace(
	pdfpcConfig: ResolvedPdfpcConfigV2 | undefined,
	pageNumber: number,
	durationMs: number,
	talkTimeMs: number,
): { expectedTimeSeconds: number; talkTimeSeconds: number } {
	const currentSlideIndex = getCurrentSlideIndex(pdfpcConfig, pageNumber);

	const pageCount = pdfpcConfig?.pages.length ?? 1;
	const endUserSlide = Math.max(
		0,
		Math.min(pdfpcConfig?.endSlide ?? pageCount - 1, pageCount - 1),
	);
	const effectiveSlideIndex = Math.min(currentSlideIndex, endUserSlide);

	const expectedProgress = (effectiveSlideIndex + 0.5) / (endUserSlide + 1);
	const expectedTimeSeconds = (durationMs / 1000) * expectedProgress;
	const talkTimeSeconds = talkTimeMs / 1000;

	return { expectedTimeSeconds, talkTimeSeconds };
}

function buildTimerView(
	pdfpcConfig: ResolvedPdfpcConfigV2 | undefined,
	pageNumber: number,
	nowMs: number,
	timerState: TimerState,
): TimerView {
	const schedule = resolveTimerSchedule(
		pdfpcConfig,
		new Date(timerState.anchorMs),
	);
	const elapsedMs = calcElapsedMs(timerState, nowMs);

	const { talkTimeMs, isPreTalk, durationMs, displayMs } = calcTiming(
		nowMs,
		elapsedMs,
		timerState.hasStarted,
		schedule,
	);

	const pace = calcPace(pdfpcConfig, pageNumber, durationMs, talkTimeMs);

	const timerColorState = resolveTimerColorState(
		isPreTalk,
		durationMs,
		talkTimeMs,
		pace.expectedTimeSeconds,
		pace.talkTimeSeconds,
	);

	return {
		displayText: formatDuration(displayMs),
		clockText: clockFormatter.format(nowMs),
		timerColorState,
		isRunning: timerState.isRunning,
	};
}

export function Timer({ pdfpcConfig, pageNumber = 1 }: TimerProps) {
	const nowMs = useNowMs(1000);

	const [timerState, dispatch] = useReducer(
		timerReducer,
		undefined,
		(): TimerState => ({
			isRunning: false,
			hasStarted: false,
			startMs: null,
			accumulatedMs: 0,
			anchorMs: Date.now(),
		}),
	);

	// 前回値での render 中条件付き更新パターン
	const [prevPageNumber, setPrevPageNumber] = useState<number>(pageNumber);
	if (prevPageNumber !== pageNumber) {
		setPrevPageNumber(pageNumber);
		if (!timerState.hasStarted && pageNumber > 1) {
			dispatch({ type: "AUTO_START", nowMs: Date.now() });
		}
	}

	const view = buildTimerView(pdfpcConfig, pageNumber, nowMs, timerState);

	return (
		<div className="flex flex-col gap-1 items-center">
			<div className="flex items-center gap-4 text-3xl font-mono">
				<span
					className={cn("text-3xl font-mono h-auto p-2 tabular-nums", {
						"text-timer-pretalk": view.timerColorState === "pretalk",
						"text-timer-too-fast": view.timerColorState === "too-fast",
						"text-timer-too-slow": view.timerColorState === "too-slow",
						"text-timer-overtime": view.timerColorState === "overtime",
					})}
				>
					{view.displayText}
				</span>
			</div>

			<div className="text-sm font-mono text-muted-foreground tabular-nums">
				{view.clockText}
			</div>

			<div className="flex gap-2">
				<Button
					type="button"
					variant={view.isRunning ? "secondary" : "default"}
					size="icon-sm"
					onClick={() => dispatch({ type: "TOGGLE", nowMs: Date.now() })}
				>
					{view.isRunning ? <PauseIcon /> : <PlayIcon />}
				</Button>

				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() =>
						dispatch({
							type: "RESET",
							nowMs: Date.now(),
							hasStartedAfterReset: pageNumber > 1,
						})
					}
				>
					<RotateCcwIcon />
				</Button>
			</div>
		</div>
	);
}
