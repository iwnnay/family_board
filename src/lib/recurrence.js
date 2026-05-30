/**
 * Recurrence helpers.
 *
 * Recurring events are *materialised* — one stored row per occurrence, all
 * sharing a series_id (see queries/calendar.js). This module owns the pure
 * date math that decides when occurrences fall, used both to generate a
 * series' rows and to extend ("heal") the rolling horizon.
 *
 * All timestamps are the app's UTC storage strings ('YYYY-MM-DD HH:MM:SS').
 * Stepping is done in UTC so the stored wall-clock time-of-day is preserved.
 */

import { parseUtc, toUtcString } from './time.js';

export const RECURRENCE_OPTIONS = [
	{ value: 'none', label: 'Does not repeat' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'biweekly', label: 'Every 2 weeks' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'yearly', label: 'Yearly' }
];

const VALID = new Set(RECURRENCE_OPTIONS.map((o) => o.value));

/** Normalises an arbitrary recurrence value to a supported one. */
export function normalizeRecurrence(value) {
	return VALID.has(value) ? value : 'none';
}

/** Adds whole days to a Date in UTC, returning a new Date. */
function addDays(date, days) {
	const d = new Date(date.getTime());
	d.setUTCDate(d.getUTCDate() + days);
	return d;
}

/**
 * Adds calendar months in UTC, clamping the day to the last day of the target
 * month (e.g. Jan 31 + 1 month → Feb 28/29). Reused for yearly (n = 12).
 */
function addMonths(date, months) {
	const d = new Date(date.getTime());
	const day = d.getUTCDate();
	d.setUTCDate(1);
	d.setUTCMonth(d.getUTCMonth() + months);
	const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
	d.setUTCDate(Math.min(day, lastDay));
	return d;
}

/**
 * Returns the start of occurrence number `n` (0-based) computed from the
 * original anchor. Anchoring off the base — rather than stepping from the
 * previous occurrence — avoids drift: a monthly event on the 31st clamps to
 * Feb 28 but still lands on Mar 31, not Mar 28.
 */
function occurrenceStart(baseStart, recurrence, n) {
	switch (recurrence) {
		case 'weekly':
			return addDays(baseStart, 7 * n);
		case 'biweekly':
			return addDays(baseStart, 14 * n);
		case 'monthly':
			return addMonths(baseStart, n);
		case 'yearly':
			return addMonths(baseStart, 12 * n);
		default:
			return null;
	}
}

// Safety cap so a malformed rule can never loop forever (~19 years weekly).
const MAX_OCCURRENCES = 1200;

/**
 * Generates the concrete occurrences of a series within a window, preserving
 * the anchor's duration on each.
 *
 * @param {object} series
 * @param {string} series.start_time  Anchor start (UTC storage string).
 * @param {string} series.end_time    Anchor end (defines the duration).
 * @param {string} series.recurrence  'weekly' | 'biweekly' | 'monthly' | 'yearly'
 * @param {string|null} [series.recurrence_end]  Inclusive last date ('YYYY-MM-DD').
 * @param {object} bounds
 * @param {string|null} [bounds.after]    Exclusive lower bound on start_time
 *                                        (e.g. the head, to skip re-emitting it).
 * @param {string} bounds.through         Inclusive upper bound on start_time.
 * @returns {{ start_time: string, end_time: string }[]}
 */
export function generateOccurrences(series, { after = null, through }) {
	const recurrence = normalizeRecurrence(series.recurrence);
	if (recurrence === 'none') {
		const within = (!after || series.start_time > after) && series.start_time <= through;
		return within ? [{ start_time: series.start_time, end_time: series.end_time }] : [];
	}

	const anchor = parseUtc(series.start_time);
	const durationMs = parseUtc(series.end_time) - anchor;
	const hardEnd = series.recurrence_end ? `${series.recurrence_end} 23:59:59` : null;

	const out = [];
	for (let i = 0; i < MAX_OCCURRENCES; i++) {
		const start = occurrenceStart(anchor, recurrence, i);
		if (!start) break;
		const startStr = toUtcString(start);

		if (hardEnd && startStr > hardEnd) break;
		if (startStr > through) break;
		if (!after || startStr > after) {
			out.push({ start_time: startStr, end_time: toUtcString(new Date(start.getTime() + durationMs)) });
		}
	}
	return out;
}
