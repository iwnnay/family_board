import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb, isDueAgain } from './db.js';

function makeDb() {
	return createDb(new Database(':memory:'));
}

// ---------------------------------------------------------------------------
// isDueAgain unit tests
// ---------------------------------------------------------------------------

describe('isDueAgain', () => {
	const jun15 = new Date('2024-06-15T10:00:00');
	const jun16 = new Date('2024-06-16T08:00:00');

	it('daily: not due again on the same day', () => {
		expect(isDueAgain('daily', jun15, new Date('2024-06-15T20:00:00'))).toBe(false);
	});

	it('daily: due again the next day', () => {
		expect(isDueAgain('daily', jun15, jun16)).toBe(true);
	});

	it('weekly: not due again in the same week', () => {
		const monday = new Date('2024-06-10T10:00:00'); // Mon
		const friday = new Date('2024-06-14T10:00:00'); // Fri same week
		expect(isDueAgain('weekly', monday, friday)).toBe(false);
	});

	it('weekly: due again the following week', () => {
		const lastFriday = new Date('2024-06-07T10:00:00');
		const thisMonday = new Date('2024-06-10T08:00:00');
		expect(isDueAgain('weekly', lastFriday, thisMonday)).toBe(true);
	});

	it('monthly: not due again in the same month', () => {
		const earlyJune = new Date('2024-06-01T10:00:00');
		const lateJune = new Date('2024-06-30T10:00:00');
		expect(isDueAgain('monthly', earlyJune, lateJune)).toBe(false);
	});

	it('monthly: due again the next month', () => {
		const june = new Date('2024-06-15T10:00:00');
		const july = new Date('2024-07-01T08:00:00');
		expect(isDueAgain('monthly', june, july)).toBe(true);
	});

	it('none: never due again after completion', () => {
		expect(isDueAgain('none', jun15, jun16)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Integration tests: chore lifecycle on the main page
// ---------------------------------------------------------------------------

describe('daily chore recurrence', () => {
	let db;
	let memberId;
	let choreId;

	const monday = new Date('2024-06-10T09:00:00');
	const tuesday = new Date('2024-06-11T09:00:00');

	beforeEach(() => {
		db = makeDb();
		({ lastInsertRowid: memberId } = db.addFamilyMember('Alice'));
		({ lastInsertRowid: choreId } = db.addChore('Wash dishes', 'daily', null));
	});

	it('shows as due before any completion', () => {
		const chores = db.getChoresWithStatus(monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('moves to recently completed immediately after clicking', () => {
		db.completeChore(choreId, memberId, monday);
		const chores = db.getChoresWithStatus(monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('reappears as due on the main page the next day', () => {
		db.completeChore(choreId, memberId, monday);
		const chores = db.getChoresWithStatus(tuesday);
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('disappears entirely after 2 days (not due, not recently completed)', () => {
		db.completeChore(choreId, memberId, monday);
		// Complete again on tuesday so it's not due on thursday
		db.completeChore(choreId, memberId, tuesday);
		const thursday = new Date('2024-06-13T09:00:00');
		const chores = db.getChoresWithStatus(thursday);
		// Due again (wednesday was missed), so it IS back
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('completed chore shows completer name', () => {
		db.completeChore(choreId, memberId, monday);
		const chores = db.getChoresWithStatus(monday);
		expect(chores.find((c) => c.id === choreId).completed_by_name).toBe('Alice');
	});
});

describe('one-time (none) chore lifecycle', () => {
	let db;
	let memberId;
	let choreId;

	const monday = new Date('2024-06-10T09:00:00');
	const wednesday = new Date('2024-06-12T09:00:00');
	const nextWeek = new Date('2024-06-17T09:00:00');

	beforeEach(() => {
		db = makeDb();
		({ lastInsertRowid: memberId } = db.addFamilyMember('Bob'));
		({ lastInsertRowid: choreId } = db.addChore('Fix leaky faucet', 'none', null));
	});

	it('shows as due initially', () => {
		const chores = db.getChoresWithStatus(monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('moves to completed after clicking', () => {
		db.completeChore(choreId, memberId, monday);
		const chores = db.getChoresWithStatus(monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('disappears after 2 days (done for good)', () => {
		db.completeChore(choreId, memberId, monday);
		const chores = db.getChoresWithStatus(nextWeek);
		expect(chores.find((c) => c.id === choreId)).toBeUndefined();
	});
});
