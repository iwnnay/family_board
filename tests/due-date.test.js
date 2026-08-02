import { describe, it, expect } from 'vitest';
import { parseDueDate, toDateString } from '$lib/due-date.js';

// Fixed reference point: Sunday 2 Aug 2026 (local midnight).
const SUNDAY = new Date(2026, 7, 2);
const THURSDAY = new Date(2026, 7, 6);

function parse(text, today = SUNDAY) {
	return parseDueDate(text, { today });
}

describe('parseDueDate', () => {
	it('strips a lead-in weekday phrase and resolves the next calendar match', () => {
		const result = parse('Clean the gutter by Thursday');
		expect(result.text).toBe('Clean the gutter');
		expect(result.dueDate).toBe('2026-08-06');
		expect(result.matched).toBe('by Thursday');
	});

	it('accepts a bare weekday at the end of the item', () => {
		expect(parse('Mow the lawn Friday')).toMatchObject({ text: 'Mow the lawn', dueDate: '2026-08-07' });
	});

	it('leaves a weekday alone when it is part of the task wording', () => {
		expect(parse('Buy Sunday roast')).toMatchObject({ text: 'Buy Sunday roast', dueDate: null });
	});

	it('keeps possessive weekdays intact', () => {
		expect(parse('Wrap gift for Monday’s party')).toMatchObject({ dueDate: null });
	});

	it('resolves today, tonight and tomorrow', () => {
		expect(parse('Take out trash tonight')).toMatchObject({ text: 'Take out trash', dueDate: '2026-08-02' });
		expect(parse('Call the vet tomorrow')).toMatchObject({ text: 'Call the vet', dueDate: '2026-08-03' });
		expect(parse('Water plants today')).toMatchObject({ text: 'Water plants', dueDate: '2026-08-02' });
	});

	it('handles relative offsets', () => {
		expect(parse('Return library books in 3 days')).toMatchObject({ text: 'Return library books', dueDate: '2026-08-05' });
		expect(parse('Rotate tires in 2 weeks')).toMatchObject({ text: 'Rotate tires', dueDate: '2026-08-16' });
		expect(parse('Pay dues next week')).toMatchObject({ text: 'Pay dues', dueDate: '2026-08-09' });
		expect(parse('Renew tags next month')).toMatchObject({ text: 'Renew tags', dueDate: '2026-09-02' });
	});

	it('only reads weekday abbreviations after a lead-in word', () => {
		expect(parse('Trim hedge by thurs')).toMatchObject({ text: 'Trim hedge', dueDate: '2026-08-06' });
		expect(parse('Remember where I sat')).toMatchObject({ text: 'Remember where I sat', dueDate: null });
	});

	it('counts today as the match for a bare weekday, but "next" skips a week', () => {
		expect(parse('Take out bins Thursday', THURSDAY).dueDate).toBe('2026-08-06');
		expect(parse('Take out bins next Thursday', THURSDAY).dueDate).toBe('2026-08-13');
	});

	it('does not consume the entire item text', () => {
		expect(parse('tomorrow')).toMatchObject({ text: 'tomorrow', dueDate: null });
	});

	it('returns the input unchanged when nothing matches', () => {
		expect(parse('Buy milk')).toEqual({ text: 'Buy milk', dueDate: null, matched: null });
		expect(parse('')).toEqual({ text: '', dueDate: null, matched: null });
	});

	it('tidies up punctuation left behind', () => {
		expect(parse('Email the school, by Friday')).toMatchObject({ text: 'Email the school' });
	});
});

describe('toDateString', () => {
	it('formats a local date without shifting timezone', () => {
		expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
		expect(toDateString(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
	});
});
