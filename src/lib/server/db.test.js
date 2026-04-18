import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { createTestDb } from './db.js';
import { isDueAgain, categorizeChores } from '../chore-logic.js';
import { family as familyTable, chores as choresTable } from './schema/sqlite.js';
import { addFamilyMember } from './queries/family.js';
import { addChore, getChoresWithStatus } from './queries/chores.js';
import { completeChore } from './queries/completions.js';

function makeDb() {
	return createTestDb(new Database(':memory:'));
}

// Helper: insert and return the auto-generated id
async function insertMember(db, name, color = 'blue') {
	await addFamilyMember(db, name, color);
	const [row] = await db.select({ id: familyTable.id }).from(familyTable).where(eq(familyTable.name, name));
	return row.id;
}

async function insertChore(db, name, frequency) {
	await addChore(db, name, frequency, null, null);
	const [row] = await db.select({ id: choresTable.id }).from(choresTable).where(eq(choresTable.name, name));
	return row.id;
}

// ---------------------------------------------------------------------------
// Pure logic — no database required
// ---------------------------------------------------------------------------

describe('isDueAgain', () => {
	const jun15 = new Date('2024-06-15T10:00:00');

	it('daily: not due again on the same day', () => {
		expect(isDueAgain('daily', jun15, new Date('2024-06-15T20:00:00'))).toBe(false);
	});

	it('daily: due again the next day', () => {
		expect(isDueAgain('daily', jun15, new Date('2024-06-16T08:00:00'))).toBe(true);
	});

	it('weekly: not due again in the same week', () => {
		expect(isDueAgain('weekly', new Date('2024-06-10T10:00:00'), new Date('2024-06-14T10:00:00'))).toBe(false);
	});

	it('weekly: due again the following week', () => {
		expect(isDueAgain('weekly', new Date('2024-06-07T10:00:00'), new Date('2024-06-10T08:00:00'))).toBe(true);
	});

	it('monthly: not due again in the same month', () => {
		expect(isDueAgain('monthly', new Date('2024-06-01T10:00:00'), new Date('2024-06-30T10:00:00'))).toBe(false);
	});

	it('monthly: due again the next month', () => {
		expect(isDueAgain('monthly', new Date('2024-06-15T10:00:00'), new Date('2024-07-01T08:00:00'))).toBe(true);
	});

	it('none: never due again after completion', () => {
		expect(isDueAgain('none', jun15, new Date('2024-06-16T08:00:00'))).toBe(false);
	});
});

describe('categorizeChores', () => {
	const now = new Date('2024-06-15T12:00:00');

	it('chore with no completion is due', () => {
		const result = categorizeChores([{ id: 1, frequency: 'daily', completed_at: null }], now);
		expect(result[0].status).toBe('due');
	});

	it('daily chore completed today is recently completed', () => {
		const result = categorizeChores([{ id: 1, frequency: 'daily', completed_at: '2024-06-15 08:00:00' }], now);
		expect(result[0].status).toBe('completed');
	});

	it('daily chore completed yesterday is due', () => {
		const result = categorizeChores([{ id: 1, frequency: 'daily', completed_at: '2024-06-14 08:00:00' }], now);
		expect(result[0].status).toBe('due');
	});

	it('chore completed more than 2 days ago is hidden', () => {
		const result = categorizeChores([{ id: 1, frequency: 'none', completed_at: '2024-06-10 08:00:00' }], now);
		expect(result).toHaveLength(0);
	});

	it('due chores are sorted by frequency order', () => {
		const rows = [
			{ id: 1, frequency: 'yearly', completed_at: null },
			{ id: 2, frequency: 'daily', completed_at: null },
			{ id: 3, frequency: 'none', completed_at: null }
		];
		expect(categorizeChores(rows, now).map((c) => c.frequency)).toEqual(['none', 'daily', 'yearly']);
	});
});

// ---------------------------------------------------------------------------
// Integration — real in-memory SQLite via Drizzle
// ---------------------------------------------------------------------------

describe('daily chore recurrence', () => {
	let db;
	let memberId;
	let choreId;

	const monday = new Date('2024-06-10T09:00:00');
	const tuesday = new Date('2024-06-11T09:00:00');

	beforeEach(async () => {
		db = makeDb();
		memberId = await insertMember(db, 'Alice');
		choreId = await insertChore(db, 'Wash dishes', 'daily');
	});

	it('shows as due before any completion', async () => {
		const chores = await getChoresWithStatus(db, monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('moves to recently completed immediately after clicking', async () => {
		await completeChore(db, choreId, memberId, monday);
		const chores = await getChoresWithStatus(db, monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('reappears as due on the main page the next day', async () => {
		await completeChore(db, choreId, memberId, monday);
		const chores = await getChoresWithStatus(db, tuesday);
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('completed chore shows completer name', async () => {
		await completeChore(db, choreId, memberId, monday);
		const chores = await getChoresWithStatus(db, monday);
		expect(chores.find((c) => c.id === choreId).completed_by_name).toBe('Alice');
	});
});

describe('one-time (none) chore lifecycle', () => {
	let db;
	let memberId;
	let choreId;

	const monday = new Date('2024-06-10T09:00:00');
	const nextWeek = new Date('2024-06-17T09:00:00');

	beforeEach(async () => {
		db = makeDb();
		memberId = await insertMember(db, 'Bob');
		choreId = await insertChore(db, 'Fix leaky faucet', 'none');
	});

	it('shows as due initially', async () => {
		const chores = await getChoresWithStatus(db, monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('due');
	});

	it('moves to completed after clicking', async () => {
		await completeChore(db, choreId, memberId, monday);
		const chores = await getChoresWithStatus(db, monday);
		expect(chores.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('disappears after 2 days (done for good)', async () => {
		await completeChore(db, choreId, memberId, monday);
		const chores = await getChoresWithStatus(db, nextWeek);
		expect(chores.find((c) => c.id === choreId)).toBeUndefined();
	});
});
