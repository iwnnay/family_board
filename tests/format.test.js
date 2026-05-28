import { describe, it, expect } from 'vitest';
import { fmtTime, fmtDate, fmtDateLong, fmtMonthDay, fmtTimeRange } from '$lib/format.js';

const ISO = '2024-06-15T14:30:00';
const DATE = new Date(ISO);
const END_ISO = '2024-06-15T15:30:00';

describe('fmtTime', () => {
	it('accepts an ISO string', () => {
		const out = fmtTime(ISO);
		expect(typeof out).toBe('string');
		expect(out.length).toBeGreaterThan(0);
	});

	it('accepts a Date instance', () => {
		const out = fmtTime(DATE);
		expect(typeof out).toBe('string');
		expect(out.length).toBeGreaterThan(0);
	});

	it('contains hour and minute (2:30 PM-ish)', () => {
		const out = fmtTime(ISO);
		expect(out).toMatch(/2:30/);
		expect(out).toMatch(/PM/i);
	});
});

describe('fmtDate', () => {
	it("contains 'Jun', '15', and '2024'", () => {
		const out = fmtDate(ISO);
		expect(out).toMatch(/Jun/);
		expect(out).toMatch(/15/);
		expect(out).toMatch(/2024/);
	});

	it('accepts a Date instance', () => {
		const out = fmtDate(DATE);
		expect(out).toMatch(/Jun/);
		expect(out).toMatch(/2024/);
	});
});

describe('fmtDateLong', () => {
	it('contains a weekday abbreviation', () => {
		const out = fmtDateLong(ISO);
		// Saturday June 15, 2024 — weekday short abbrevs are 3 letters
		expect(out).toMatch(/Sat|Sun|Mon|Tue|Wed|Thu|Fri/);
	});

	it('contains month, day, and year', () => {
		const out = fmtDateLong(ISO);
		expect(out).toMatch(/Jun/);
		expect(out).toMatch(/15/);
		expect(out).toMatch(/2024/);
	});
});

describe('fmtMonthDay', () => {
	it('contains month abbrev and day but not the year', () => {
		const out = fmtMonthDay(ISO);
		expect(out).toMatch(/Jun/);
		expect(out).toMatch(/15/);
		expect(out).not.toMatch(/2024/);
	});
});

describe('fmtTimeRange', () => {
	it('combines start date, start time, en-dash, end time', () => {
		const out = fmtTimeRange(ISO, END_ISO);
		expect(out).toMatch(/Jun/);
		expect(out).toMatch(/15/);
		expect(out).toMatch(/2024/);
		expect(out).toMatch(/2:30/);
		expect(out).toMatch(/3:30/);
		expect(out).toContain('–');
	});

	it('accepts Date instances', () => {
		const out = fmtTimeRange(DATE, new Date(END_ISO));
		expect(out).toMatch(/2:30/);
		expect(out).toMatch(/3:30/);
		expect(out).toContain('–');
	});
});
