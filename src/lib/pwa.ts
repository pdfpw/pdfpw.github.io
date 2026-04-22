import { registerSW } from "virtual:pwa-register";
import { atom, getDefaultStore } from "jotai";

export const updateAvailableAtom = atom(false);
export const offlineReadyAtom = atom(false);

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function registerPwa() {
	const store = getDefaultStore();
	updateSW = registerSW({
		onNeedRefresh() {
			store.set(updateAvailableAtom, true);
		},
		onOfflineReady() {
			store.set(offlineReadyAtom, true);
		},
	});
}

export async function applyUpdate() {
	await updateSW?.(true);
}
