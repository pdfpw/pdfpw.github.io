import { use } from "react";
import type { RecentFile } from "../../lib/recent-store";
import { RecentSection } from "./RecentSection";

type RecentSectionDataProps = {
	recentFilesPromise: Promise<RecentFile[]>;
	onClearRecent: () => Promise<void> | void;
	onRecentClick: (item: RecentFile) => Promise<void>;
	onDeleteRecent: (id: string) => Promise<void>;
};

export function RecentSectionData({
	recentFilesPromise,
	onClearRecent,
	onRecentClick,
	onDeleteRecent,
}: RecentSectionDataProps) {
	const recentFiles = use(recentFilesPromise);

	return (
		<RecentSection
			supportsFSA
			recentFiles={recentFiles}
			onClearRecent={onClearRecent}
			onRecentClick={onRecentClick}
			onDeleteRecent={onDeleteRecent}
		/>
	);
}
