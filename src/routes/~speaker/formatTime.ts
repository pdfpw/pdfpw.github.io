export function formatTime(totalMs: number) {
	const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (value: number) => value.toString().padStart(2, "0");
	if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
	return `${pad(minutes)}:${pad(seconds)}`;
}
