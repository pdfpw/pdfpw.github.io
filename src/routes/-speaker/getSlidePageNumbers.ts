export function getSlidePageNumbers(labels: string[]): number[][] {
	const pages: number[][] = [];
	let currentLabel = null;
  let currentPageNumbers: number[] = [];
	for (const [index, label] of labels.entries()) {
		if (label !== currentLabel) {
			currentLabel = label;
			pages.push(currentPageNumbers = [index + 1]);
		}else {
      currentPageNumbers.push(index + 1);
    }
	}
	return pages;
}

