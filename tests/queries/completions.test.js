import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeMember, makeChore } from '../helpers.js';
import { chores_completed } from '$lib/server/schema/sqlite.js';
import { completeChore, getStats } from '$lib/server/queries/completions.js';

describe('completeChore', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('inserts a row with chore_id, member_id, and timestamp', async () => {
		const member = await makeMember(db, 'Alice');
		const choreId = await makeChore(db, 'Dishes', 'daily');
		// Use explicit UTC so the stored string is timezone-independent
		const when = new Date('2024-06-15T09:30:45Z');

		await completeChore(db, choreId, member.id, when);

		const rows = await db.select().from(chores_completed).where(eq(chores_completed.chore_id, choreId));
		expect(rows).toHaveLength(1);
		expect(rows[0].completed_by).toBe(member.id);
		expect(rows[0].completed_at).toBe('2024-06-15 09:30:45');
	});
});

describe('getStats - mostDailyChores', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the member who completed the most daily chores', async () => {
		const alice = await makeMember(db, 'Alice');
		const choreId = await makeChore(db, 'Dishes', 'daily');

		await completeChore(db, choreId, alice.id, new Date('2024-06-10T09:00:00'));
		await completeChore(db, choreId, alice.id, new Date('2024-06-11T09:00:00'));
		await completeChore(db, choreId, alice.id, new Date('2024-06-12T09:00:00'));

		const stats = await getStats(db, new Date('2024-06-15T09:00:00'));
		expect(stats.mostDailyChores.name).toBe('Alice');
		expect(stats.mostDailyChores.count).toBe(3);
	});
});

describe('getStats - mostThisMonth', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the member with the most completions in the current month', async () => {
		const alice = await makeMember(db, 'Alice');
		const bob = await makeMember(db, 'Bob');
		const choreId = await makeChore(db, 'Dishes', 'daily');

		// Alice: 1 this month
		await completeChore(db, choreId, alice.id, new Date('2024-06-05T09:00:00'));
		// Bob: 3 this month
		await completeChore(db, choreId, bob.id, new Date('2024-06-06T09:00:00'));
		await completeChore(db, choreId, bob.id, new Date('2024-06-07T09:00:00'));
		await completeChore(db, choreId, bob.id, new Date('2024-06-08T09:00:00'));

		const stats = await getStats(db, new Date('2024-06-15T09:00:00'));
		expect(stats.mostThisMonth.name).toBe('Bob');
		expect(stats.mostThisMonth.count).toBe(3);
	});

	it('ignores completions from previous months', async () => {
		const alice = await makeMember(db, 'Alice');
		const choreId = await makeChore(db, 'Dishes', 'daily');
		await completeChore(db, choreId, alice.id, new Date('2024-05-31T09:00:00'));

		const stats = await getStats(db, new Date('2024-06-15T09:00:00'));
		expect(stats.mostThisMonth).toBeNull();
	});
});

describe('getStats - dueCount', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('counts chores currently due', async () => {
		const alice = await makeMember(db, 'Alice');
		const a = await makeChore(db, 'A', 'daily');
		await makeChore(db, 'B', 'daily');
		await makeChore(db, 'C', 'daily');
		const now = new Date('2024-06-15T09:00:00');

		// A is completed today → not due. B and C remain due.
		await completeChore(db, a, alice.id, now);

		const stats = await getStats(db, now);
		expect(stats.dueCount).toBe(2);
	});

	it('is zero when every chore has been completed today', async () => {
		const alice = await makeMember(db, 'Alice');
		const choreId = await makeChore(db, 'Dishes', 'daily');
		const now = new Date('2024-06-15T09:00:00');
		await completeChore(db, choreId, alice.id, now);

		const stats = await getStats(db, now);
		expect(stats.dueCount).toBe(0);
	});
});
