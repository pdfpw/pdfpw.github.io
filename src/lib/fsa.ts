export function canUseFSA() {
	return (
		typeof window !== "undefined" &&
		"showOpenFilePicker" in window &&
		"indexedDB" in window
	);
}

async function ensureHandlePermission(
	handle: FileSystemFileHandle,
	mode: "read" | "readwrite",
) {
	if (!handle.queryPermission || !handle.requestPermission) return false;
	const status = await handle.queryPermission({ mode });
	if (status === "granted") return true;
	if (status === "prompt") {
		const req = await handle.requestPermission({ mode });
		return req === "granted";
	}
	return false;
}

export async function ensureHandleReadable(handle: FileSystemFileHandle) {
	return ensureHandlePermission(handle, "read");
}

export async function ensureHandleWritable(handle: FileSystemFileHandle) {
	return ensureHandlePermission(handle, "readwrite");
}
