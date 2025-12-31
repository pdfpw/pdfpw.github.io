import { useSyncExternalStore } from "react";

export function useLocalStorageSync<T>(
	key: string,
	initialValue: T,
): [T, (value: T) => void] {
	const getSnapshot = () => {
		const value = localStorage.getItem(key);
		if (value === null) return initialValue;
		try {
			return JSON.parse(value) as T;
		} catch {
			return initialValue;
		}
	};

	const subscribe = (callback: () => void) => {
		const onChange = (e: StorageEvent) => {
			if (e.key === key) {
				callback();
			}
		};
		window.addEventListener("storage", onChange);
		return () => window.removeEventListener("storage", onChange);
	};

	const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const setValue = (newValue: T) => {
		const value = JSON.stringify(newValue);
		localStorage.setItem(key, value);
		// Dispatch event for same-tab sync if needed, though useSyncExternalStore usually handles storage events from OTHER tabs.
		// To trigger update in the same tab for other components using the same hook:
		window.dispatchEvent(
			new StorageEvent("storage", {
				key,
				newValue: value,
				storageArea: localStorage,
			}),
		);
	};

	return [store, setValue];
}
