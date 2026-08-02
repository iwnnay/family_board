import { describe, it, expect } from 'vitest';
import { sortListItems, priorityRank, dueTone, dueLabel } from '$lib/list-items.js';

const TODAY = new Date(2026, 7, 2); // Sunday 2 Aug 2026

describe('sortListItems', () => {
	it('puts dated items first, earliest due date leading', () => {
		const items = [
			{ id: 1, due_date: null, priority: 'high' },
			{ id: 2, due_date: '2026-08-10', priority: 'none' },
			{ id: 3, due_date: '2026-08-03', priority: 'low' }
		];
		expect(sortListItems(items).map((i) => i.id)).toEqual([3, 2, 1]);
	});

	it('breaks due-date ties by priority high → medium → low → none', () => {
		const items = [
			{ id: 1, due_date: '2026-08-05', priority: 'low' },
			{ id: 2, due_date: '2026-08-05', priority: 'high' },
			{ id: 3, due_date: '2026-08-05', priority: 'none' },
			{ id: 4, due_date: '2026-08-05', priority: 'medium' }
		];
		expect(sortListItems(items).map((i) => i.id)).toEqual([2, 4, 1, 3]);
	});

	it('orders undated items by priority, then insertion order', () => {
		const items = [
			{ id: 7, due_date: null, priority: 'none' },
			{ id: 8, due_date: null, priority: 'medium' },
			{ id: 9, due_date: null, priority: 'none' },
			{ id: 10, due_date: null, priority: 'high' }
		];
		expect(sortListItems(items).map((i) => i.id)).toEqual([10, 8, 7, 9]);
	});

	it('does not mutate the input array', () => {
		const items = [
			{ id: 2, due_date: null, priority: 'none' },
			{ id: 1, due_date: '2026-08-01', priority: 'none' }
		];
		sortListItems(items);
		expect(items.map((i) => i.id)).toEqual([2, 1]);
	});
});

describe('priorityRank', () => {
	it('ranks known priorities and sorts unknown values last', () => {
		expect(priorityRank('high')).toBeLessThan(priorityRank('medium'));
		expect(priorityRank('low')).toBeLessThan(priorityRank('none'));
		expect(priorityRank(undefined)).toBe(priorityRank('none'));
	});
});

describe('dueTone', () => {
	it('classifies relative urgency', () => {
		expect(dueTone(null, TODAY)).toBeNull();
		expect(dueTone('2026-08-01', TODAY)).toBe('overdue');
		expect(dueTone('2026-08-02', TODAY)).toBe('today');
		expect(dueTone('2026-08-05', TODAY)).toBe('soon');
		expect(dueTone('2026-08-20', TODAY)).toBe('later');
	});
});

describe('dueLabel', () => {
	it('uses relative wording for nearby dates', () => {
		expect(dueLabel('2026-08-02', TODAY)).toBe('Today');
		expect(dueLabel('2026-08-03', TODAY)).toBe('Tomorrow');
		expect(dueLabel('2026-08-01', TODAY)).toBe('Yesterday');
		expect(dueLabel('', TODAY)).toBe('');
	});

	it('falls back to a weekday inside the week and a date beyond it', () => {
		expect(dueLabel('2026-08-06', TODAY)).toBe('Thu');
		expect(dueLabel('2026-08-21', TODAY)).toBe('Aug 21');
	});
});
