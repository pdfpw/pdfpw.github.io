import { use } from "react";
import type { RecentFile, Settings } from "#src/lib/recent-store";
import { LibrarySection } from "./LibrarySection";

type LibrarySectionDataProps = {
	recentFilesPromise: Promise<RecentFile[]>;
	settings: Settings;
	onToggleHistory: (value: boolean) => void;
	onClearRecent: () => Promise<void> | void;
	onRecentClick: (item: RecentFile) => Promise<void>;
	onDeleteRecent: (id: string) => Promise<void>;
};

export function LibrarySectionData({
	recentFilesPromise,
	settings,
	onToggleHistory,
	onClearRecent,
	onRecentClick,
	onDeleteRecent,
}: LibrarySectionDataProps) {
	const recentFiles = use(recentFilesPromise);

	return (
		<LibrarySection
			supportsFSA={true}
			recentFiles={recentFiles}
			settings={settings}
			onToggleHistory={onToggleHistory}
			onClearRecent={onClearRecent}
			onRecentClick={onRecentClick}
			onDeleteRecent={onDeleteRecent}
		/>
	);
}
