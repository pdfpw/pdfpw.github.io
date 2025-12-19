// Type augmentations for File System Access API (Chromium)
interface FileSystemFileHandle {
	/**
	 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/queryPermission)
	 */
	queryPermission?: (options?: {
		mode?: "read" | "readwrite";
	}) => Promise<PermissionState>;
	/**
	 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/requestPermission)
	 */
	requestPermission?: (options?: {
		mode?: "read" | "readwrite";
	}) => Promise<PermissionState>;
}

interface Window {
	/**
	 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker)
	 */
	showOpenFilePicker?: (options: {
		types?: { description?: string; accept: Record<string, string[]> }[];
		excludeAcceptAllOption?: boolean;
		multiple?: boolean;
	}) => Promise<FileSystemFileHandle[]>;
}
