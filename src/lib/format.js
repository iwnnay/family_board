/**
 * Date/time formatting helpers used across pages.
 * All accept either an ISO string ('YYYY-MM-DD HH:MM:SS') or a Date instance.
 */

import { parseUtc } from './time.js';

function asDate(input) {
	return input instanceof Date ? input : parseUtc(input);
}

export function fmtTime(input) {
	return asDate(input).toLocaleTimeString([], {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}

export function fmtDate(input) {
	return asDate(input).toLocaleDateString([], {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function fmtDateLong(input) {
	return asDate(input).toLocaleDateString([], {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function fmtMonthDay(input) {
	return asDate(input).toLocaleDateString([], {
		month: 'short',
		day: 'numeric'
	});
}

export function fmtTimeRange(start, end) {
	return `${fmtDateLong(start)}, ${fmtTime(start)} – ${fmtTime(end)}`;
}
