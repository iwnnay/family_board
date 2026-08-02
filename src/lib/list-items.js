/**
 * Shared (client + server) helpers for list item priority, ordering and
 * due-date presentation. Pure functions only — no DB or DOM access.
 */

import { toDateString } from './due-date.js';

export const PRIORITIES = [
	{ key: 'high', label: 'High', symbol: '!!!' },
	{ key: 'medium', label: 'Medium', symbol: '!!' },
	{ key: 'low', label: 'Low', symbol: '!' },
	{ key: 'none', label: 'None', symbol: '' }
];

const PRIORITY_RANK = { high: 0, medium: 1, low: 2, none: 3 };

/** Sort weight for a priority key; unknown/missing values sort last. */
export function priorityRank(priority) {
	return PRIORITY_RANK[priority] ?? PRIORITY_RANK.none;
}

export function priorityLabel(priority) {
	return PRIORITIES.find((p) => p.key === priority)?.label ?? 'None';
}

/**
 * Order active items: due date ascending (undated last), then priority
 * high → medium → low → none, then insertion order.
 */
export function sortListItems(items) {
	return [...items].sort((a, b) => {
		if (a.due_date !== b.due_date) {
			if (!a.due_date) {
				return 1;
			}
			if (!b.due_date) {
				return -1;
			}
			return a.due_date < b.due_date ? -1 : 1;
		}
		const rank = priorityRank(a.priority) - priorityRank(b.priority);
		return rank !== 0 ? rank : a.id - b.id;
	});
}

/** Today as a floating 'YYYY-MM-DD' string, in the caller's timezone. */
export function todayString(today = new Date()) {
	return toDateString(today);
}

/**
 * How urgent a due date is relative to today.
 * @returns {'overdue' | 'today' | 'soon' | 'later' | null} `soon` = within 3 days.
 */
export function dueTone(dueDate, today = new Date()) {
	if (!dueDate) {
		return null;
	}
	const now = todayString(today);
	if (dueDate < now) {
		return 'overdue';
	}
	if (dueDate === now) {
		return 'today';
	}
	const soonLimit = new Date(today);
	soonLimit.setDate(soonLimit.getDate() + 3);
	return dueDate <= toDateString(soonLimit) ? 'soon' : 'later';
}

/** Short human label for a due date: "Today", "Tomorrow", "Fri", "Aug 21". */
export function dueLabel(dueDate, today = new Date()) {
	if (!dueDate) {
		return '';
	}
	const [y, m, d] = dueDate.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const days = Math.round((date - base) / 86400000);

	if (days === 0) {
		return 'Today';
	}
	if (days === 1) {
		return 'Tomorrow';
	}
	if (days === -1) {
		return 'Yesterday';
	}
	if (days > 1 && days < 7) {
		return date.toLocaleDateString([], { weekday: 'short' });
	}
	return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
