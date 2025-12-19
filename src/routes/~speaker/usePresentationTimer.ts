import { useCallback, useEffect, useState } from "react";

export function usePresentationTimer(pageNumber: number) {
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [accumulatedMs, setAccumulatedMs] = useState(0);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		if (startedAt === null) return;
		const timer = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(timer);
	}, [startedAt]);

	const elapsedMs =
		accumulatedMs + (startedAt ? Math.max(0, now - startedAt) : 0);

	const start = useCallback(() => {
		if (startedAt !== null) return;
		setStartedAt(Date.now());
		setNow(Date.now());
	}, [startedAt]);

	const pause = useCallback(() => {
		if (startedAt === null) return;
		setAccumulatedMs(elapsedMs);
		setStartedAt(null);
	}, [elapsedMs, startedAt]);

	const reset = useCallback(() => {
		setAccumulatedMs(0);
		if (pageNumber > 1) {
			setStartedAt(Date.now());
			setNow(Date.now());
		} else {
			setStartedAt(null);
		}
	}, [pageNumber]);

	const autoStartIfNeeded = useCallback(
		(nextPage: number) => {
			if (nextPage <= 1) return;
			if (startedAt !== null) return;
			if (accumulatedMs !== 0) return;
			setStartedAt(Date.now());
			setNow(Date.now());
		},
		[accumulatedMs, startedAt],
	);

	return {
		elapsedMs,
		isRunning: startedAt !== null,
		start,
		pause,
		reset,
		autoStartIfNeeded,
	};
}
