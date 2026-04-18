export const FREQ_ORDER = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

/**
 * Returns true if a chore with the given frequency should appear as due again,
 * given that its most recent completion happened at `completedAt`.
 */
export function isDueAgain(frequency, completedAt, now) {
	if (frequency === 'none') {
		return false;
	}

	switch (frequency) {
		case 'daily':
			return completedAt.toDateString() !== now.toDateString();
		case 'weekly': {
			const weekStart = new Date(now);
			weekStart.setHours(0, 0, 0, 0);
			weekStart.setDate(now.getDate() - now.getDay());
			return completedAt < weekStart;
		}
		case 'monthly':
			return completedAt.getMonth() !== now.getMonth() || completedAt.getFullYear() !== now.getFullYear();
		case 'yearly':
			return completedAt.getFullYear() !== now.getFullYear();
		default:
			return false;
	}
}

/**
 * Splits raw DB rows (each row is a chore joined with its latest completion)
 * into two buckets: due chores and recently completed chores (within 2 days).
 * Due chores are sorted by FREQ_ORDER then by name.
 */
export function categorizeChores(rows, now = new Date()) {
	const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
	const due = [];
	const recentlyCompleted = [];

	for (const chore of rows) {
		if (!chore.completed_at) {
			due.push({ ...chore, status: 'due' });
			continue;
		}

		const completedAt = new Date(chore.completed_at);

		if (isDueAgain(chore.frequency, completedAt, now)) {
			due.push({ ...chore, status: 'due' });
		} else if (completedAt >= twoDaysAgo) {
			recentlyCompleted.push({ ...chore, status: 'completed' });
		}
	}

	due.sort((a, b) => FREQ_ORDER.indexOf(a.frequency) - FREQ_ORDER.indexOf(b.frequency));
	return [...due, ...recentlyCompleted];
}
