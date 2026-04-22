import { useAtomValue } from "jotai";
import { RefreshCwIcon } from "lucide-react";
import { applyUpdate, updateAvailableAtom } from "../lib/pwa";
import { Button } from "./ui/button";

export default function UpdateToast() {
	const updateAvailable = useAtomValue(updateAvailableAtom);

	if (!updateAvailable) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-gray-800 text-white px-4 py-3 shadow-lg">
			<span className="text-sm">新しいバージョンがあります</span>
			<Button
				size="sm"
				variant="secondary"
				onClick={() => {
					applyUpdate();
				}}
			>
				<RefreshCwIcon />
				再読み込み
			</Button>
		</div>
	);
}
