import { getLocale } from "#src/paraglide/runtime.js";

export function formatDateTime(
	date: Date | number,
	options?: Intl.DateTimeFormatOptions,
): string {
	return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export function formatNumber(
	n: number,
	options?: Intl.NumberFormatOptions,
): string {
	return new Intl.NumberFormat(getLocale(), options).format(n);
}
