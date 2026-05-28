import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeMember, makeChore } from '../helpers.js';
import { chores_completed } from '$lib/server/schema/sqlite.js';
import { getChores, getChoreById, addChore, updateChore, deleteChore, getChoresWithStatus } from '$lib/server/queries/chores.js';
import { completeChore } from '$lib/server/queries/completions.js';

describe('getChoresWithStatus (weekly)', () => {
	let db;
	let memberId;
	let choreId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		choreId = await makeChore(db, 'Vacuum', 'weekly');
	});

	it('shows as completed when done earlier the same week', async () => {
		const monday = new Date('2024-06-10T09:00:00');
		const wednesday = new Date('2024-06-12T09:00:00');
		await completeChore(db, choreId, memberId, monday);
		const result = await getChoresWithStatus(db, wednesday);
		expect(result.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('shows as due again the following Monday', async () => {
		const monday = new Date('2024-06-10T09:00:00');
		const nextMonday = new Date('2024-06-17T09:00:00');
		await completeChore(db, choreId, memberId, monday);
		const result = await getChoresWithStatus(db, nextMonday);
		expect(result.find((c) => c.id === choreId).status).toBe('due');
	});
});

describe('getChoresWithStatus (monthly)', () => {
	let db;
	let memberId;
	let choreId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		choreId = await makeChore(db, 'Pay rent', 'monthly');
	});

	it('shows as completed within 2 days of completion in same month', async () => {
		const june1 = new Date('2024-06-01T09:00:00');
		const june2 = new Date('2024-06-02T09:00:00');
		await completeChore(db, choreId, memberId, june1);
		const result = await getChoresWithStatus(db, june2);
		expect(result.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('hides after 2 days if still in same month (not yet due again)', async () => {
		const june1 = new Date('2024-06-01T09:00:00');
		const june15 = new Date('2024-06-15T09:00:00');
		await completeChore(db, choreId, memberId, june1);
		const result = await getChoresWithStatus(db, june15);
		expect(result.find((c) => c.id === choreId)).toBeUndefined();
	});

	it('shows as due again on the first of the next month', async () => {
		const june1 = new Date('2024-06-01T09:00:00');
		const july1 = new Date('2024-07-01T09:00:00');
		await completeChore(db, choreId, memberId, june1);
		const result = await getChoresWithStatus(db, july1);
		expect(result.find((c) => c.id === choreId).status).toBe('due');
	});
});

describe('getChoresWithStatus (yearly)', () => {
	let db;
	let memberId;
	let choreId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		choreId = await makeChore(db, 'File taxes', 'yearly');
	});

	it('shows as completed within 2 days of completion in same year', async () => {
		const march15 = new Date('2023-03-15T09:00:00');
		const march16 = new Date('2023-03-16T09:00:00');
		await completeChore(db, choreId, memberId, march15);
		const result = await getChoresWithStatus(db, march16);
		expect(result.find((c) => c.id === choreId).status).toBe('completed');
	});

	it('hides after 2 days if still in same year (not yet due again)', async () => {
		const march15 = new Date('2023-03-15T09:00:00');
		const december2023 = new Date('2023-12-15T09:00:00');
		await completeChore(db, choreId, memberId, march15);
		const result = await getChoresWithStatus(db, december2023);
		expect(result.find((c) => c.id === choreId)).toBeUndefined();
	});

	it('shows as due again in the following year', async () => {
		const march2023 = new Date('2023-03-15T09:00:00');
		const jan2024 = new Date('2024-01-02T09:00:00');
		await completeChore(db, choreId, memberId, march2023);
		const result = await getChoresWithStatus(db, jan2024);
		expect(result.find((c) => c.id === choreId).status).toBe('due');
	});
});

describe('getChores', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns an empty array when no chores exist', async () => {
		expect(await getChores(db)).toEqual([]);
	});

	it('orders by frequency (none → yearly), then by name', async () => {
		await addChore(db, 'Zebra task', 'daily', null, null);
		await addChore(db, 'Annual review', 'yearly', null, null);
		await addChore(db, 'One-off', 'none', null, null);
		await addChore(db, 'Apple task', 'daily', null, null);
		await addChore(db, 'Monthly bill', 'monthly', null, null);

		const rows = await getChores(db);
		expect(rows.map((r) => r.name)).toEqual(['One-off', 'Apple task', 'Zebra task', 'Monthly bill', 'Annual review']);
	});
});

describe('getChoreById', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the chore with the given id', async () => {
		const id = await makeChore(db, 'Wash dishes', 'daily');
		const row = await getChoreById(db, id);
		expect(row.name).toBe('Wash dishes');
		expect(row.frequency).toBe('daily');
	});

	it('returns null when no chore matches', async () => {
		const row = await getChoreById(db, 9999);
		expect(row).toBeNull();
	});
});

describe('updateChore', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('updates name, frequency, and suggested_day', async () => {
		const id = await makeChore(db, 'Old name', 'daily');
		await updateChore(db, id, 'New name', 'weekly', 'monday');
		const row = await getChoreById(db, id);
		expect(row.name).toBe('New name');
		expect(row.frequency).toBe('weekly');
		expect(row.suggested_day).toBe('monday');
	});

	it('updates the image when a value is provided', async () => {
		const id = await makeChore(db, 'Chore', 'daily');
		await updateChore(db, id, 'Chore', 'daily', null, '/img/new.png');
		const row = await getChoreById(db, id);
		expect(row.image).toBe('/img/new.png');
	});

	it('keeps the existing image when image arg is undefined', async () => {
		const id = await makeChore(db, 'Chore', 'daily');
		await updateChore(db, id, 'Chore', 'daily', null, '/img/orig.png');

		// Now update again without providing image
		await updateChore(db, id, 'Renamed', 'daily', null);

		const row = await getChoreById(db, id);
		expect(row.name).toBe('Renamed');
		expect(row.image).toBe('/img/orig.png');
	});

	it('clears the image when null is explicitly passed', async () => {
		const id = await makeChore(db, 'Chore', 'daily');
		await updateChore(db, id, 'Chore', 'daily', null, '/img/orig.png');
		await updateChore(db, id, 'Chore', 'daily', null, null);
		const row = await getChoreById(db, id);
		expect(row.image).toBeNull();
	});
});

describe('deleteChore', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('removes the row for the given id', async () => {
		const id = await makeChore(db, 'Chore', 'daily');
		await deleteChore(db, id);
		expect(await getChoreById(db, id)).toBeNull();
	});

	it('cascade-deletes related completions', async () => {
		const id = await makeChore(db, 'Chore', 'daily');
		const member = await makeMember(db, 'Alice');
		await completeChore(db, id, member.id, new Date('2024-06-15T09:00:00'));

		const before = await db.select().from(chores_completed).where(eq(chores_completed.chore_id, id));
		expect(before).toHaveLength(1);

		await deleteChore(db, id);

		const after = await db.select().from(chores_completed).where(eq(chores_completed.chore_id, id));
		expect(after).toHaveLength(0);
	});
});
