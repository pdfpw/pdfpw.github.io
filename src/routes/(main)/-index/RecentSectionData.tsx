import { use } from "react";
import type { RecentFile, Settings } from "#src/lib/recent-store";
import { RecentSection } from "./RecentSection";

type RecentSectionDataProps = {
	recentFilesPromise: Promise<RecentFile[]>;
	settings: Settings;
	onToggleHistory: (value: boolean) => void;
	onClearRecent: () => Promise<void> | void;
	onRecentClick: (item: RecentFile) => Promise<void>;
	onDeleteRecent: (id: string) => Promise<void>;
};

export function RecentSectionData({
	recentFilesPromise,
	settings,
	onToggleHistory,
	onClearRecent,
	onRecentClick,
	onDeleteRecent,
}: RecentSectionDataProps) {
	const recentFiles = use(recentFilesPromise);

	return (
		<RecentSection
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
