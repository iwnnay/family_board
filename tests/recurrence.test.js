import { describe, it, expect } from 'vitest';
import { generateOccurrences, normalizeRecurrence } from '$lib/recurrence.js';

function series(overrides = {}) {
	return {
		start_time: '2026-01-05 14:00:00',
		end_time: '2026-01-05 15:00:00',
		recurrence: 'weekly',
		recurrence_end: null,
		...overrides
	};
}

describe('normalizeRecurrence', () => {
	it('passes through supported values', () => {
		for (const v of ['none', 'weekly', 'biweekly', 'monthly', 'yearly']) {
			expect(normalizeRecurrence(v)).toBe(v);
		}
	});

	it('falls back to none for anything else', () => {
		expect(normalizeRecurrence('hourly')).toBe('none');
		expect(normalizeRecurrence(undefined)).toBe('none');
		expect(normalizeRecurrence(null)).toBe('none');
	});
});

describe('generateOccurrences — none', () => {
	it('returns the single occurrence when within the window', () => {
		const out = generateOccurrences(series({ recurrence: 'none' }), { through: '2026-01-31 23:59:59' });
		expect(out).toEqual([{ start_time: '2026-01-05 14:00:00', end_time: '2026-01-05 15:00:00' }]);
	});

	it('excludes the anchor when `after` is at/after it', () => {
		const out = generateOccurrences(series({ recurrence: 'none' }), { after: '2026-01-05 14:00:00', through: '2026-12-31 23:59:59' });
		expect(out).toEqual([]);
	});
});

describe('generateOccurrences — weekly', () => {
	it('produces one occurrence per week through the window', () => {
		const out = generateOccurrences(series(), { through: '2026-01-31 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2026-01-05 14:00:00', '2026-01-12 14:00:00', '2026-01-19 14:00:00', '2026-01-26 14:00:00']);
	});

	it('preserves the duration on each occurrence', () => {
		const out = generateOccurrences(series(), { through: '2026-01-20 00:00:00' });
		expect(out[1]).toEqual({ start_time: '2026-01-12 14:00:00', end_time: '2026-01-12 15:00:00' });
	});

	it('skips occurrences at or before `after` (used when healing)', () => {
		const out = generateOccurrences(series(), { after: '2026-01-12 14:00:00', through: '2026-02-05 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2026-01-19 14:00:00', '2026-01-26 14:00:00', '2026-02-02 14:00:00']);
	});
});

describe('generateOccurrences — biweekly', () => {
	it('steps every 14 days', () => {
		const out = generateOccurrences(series({ recurrence: 'biweekly' }), { through: '2026-02-28 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2026-01-05 14:00:00', '2026-01-19 14:00:00', '2026-02-02 14:00:00', '2026-02-16 14:00:00']);
	});
});

describe('generateOccurrences — monthly', () => {
	it('keeps the same day-of-month', () => {
		const out = generateOccurrences(series({ start_time: '2026-01-15 09:00:00', end_time: '2026-01-15 10:00:00', recurrence: 'monthly' }), { through: '2026-04-30 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2026-01-15 09:00:00', '2026-02-15 09:00:00', '2026-03-15 09:00:00', '2026-04-15 09:00:00']);
	});

	it('clamps short months but does not drift (Jan 31 → Feb 28 → Mar 31)', () => {
		const out = generateOccurrences(series({ start_time: '2026-01-31 09:00:00', end_time: '2026-01-31 10:00:00', recurrence: 'monthly' }), { through: '2026-03-31 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2026-01-31 09:00:00', '2026-02-28 09:00:00', '2026-03-31 09:00:00']);
	});
});

describe('generateOccurrences — yearly', () => {
	it('repeats on the same month/day, clamping Feb 29', () => {
		const out = generateOccurrences(series({ start_time: '2024-02-29 09:00:00', end_time: '2024-02-29 10:00:00', recurrence: 'yearly' }), { through: '2027-12-31 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2024-02-29 09:00:00', '2025-02-28 09:00:00', '2026-02-28 09:00:00', '2027-02-28 09:00:00']);
	});
});

describe('generateOccurrences — recurrence_end', () => {
	it('stops after the inclusive end date', () => {
		const out = generateOccurrences(series({ recurrence_end: '2026-01-19' }), { through: '2026-12-31 23:59:59' });
		expect(out.map((o) => o.start_time)).toEqual(['2026-01-05 14:00:00', '2026-01-12 14:00:00', '2026-01-19 14:00:00']);
	});
});
