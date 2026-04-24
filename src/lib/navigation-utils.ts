import type { ResolvedPdfpcConfigV2 } from "#src/lib/pdfpc-config.ts";

/**
 * 現在のページが属するオーバーレイグループ（ユーザースライド）のインデックスを見つける
 * @returns グループインデックス（見つからない場合は -1）
 */
export function findUserSlideGroup(
	pages: ResolvedPdfpcConfigV2["pages"],
	currentPageNumber: number,
): number {
	for (let i = 0; i < pages.length; i++) {
		const group = pages[i];
		for (const page of group) {
			if (page.pageNumber === currentPageNumber) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * 次のユーザースライド（オーバーレイグループ）の最初のページ番号を取得
 */
export function getNextUserSlidePageNumber(
	pages: ResolvedPdfpcConfigV2["pages"],
	currentPageNumber: number,
): number | null {
	const currentGroupIndex = findUserSlideGroup(pages, currentPageNumber);
	if (currentGroupIndex === -1) return null;

	const nextGroupIndex = currentGroupIndex + 1;
	if (nextGroupIndex >= pages.length) return null; // 最後のグループ

	return pages[nextGroupIndex][0].pageNumber;
}

/**
 * 前のユーザースライド（オーバーレイグループ）の最初のページ番号を取得
 */
export function getPrevUserSlidePageNumber(
	pages: ResolvedPdfpcConfigV2["pages"],
	currentPageNumber: number,
): number | null {
	const currentGroupIndex = findUserSlideGroup(pages, currentPageNumber);
	if (currentGroupIndex <= 0) return null; // 最初のグループ

	const prevGroupIndex = currentGroupIndex - 1;
	return pages[prevGroupIndex][0].pageNumber;
}

/**
 * ページ番号を制限範囲内にクリップする
 */
export function clampPageNumber(
	pageNumber: number,
	maxPageNumber: number,
): number {
	return Math.max(1, Math.min(pageNumber, maxPageNumber));
}

/**
 * 次のページ番号を解決する（単純 +1、末尾クランプ）
 */
export function resolveNextPage(
	currentPageNumber: number,
	totalOverlays: number,
): number {
	return clampPageNumber(currentPageNumber + 1, totalOverlays);
}

/**
 * 前のページ番号を解決する（単純 -1、先頭クランプ）
 */
export function resolvePrevPage(
	currentPageNumber: number,
	totalOverlays: number,
): number {
	return clampPageNumber(currentPageNumber - 1, totalOverlays);
}

/**
 * 最初のページ番号
 */
export function resolveFirstSlide(): number {
	return 1;
}

/**
 * 最後のページ番号
 */
export function resolveLastSlide(totalOverlays: number): number {
	return totalOverlays;
}
