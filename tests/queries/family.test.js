import { describe, it, expect, beforeEach } from 'vitest';
import { makeDb, makeMember } from '../helpers.js';
import { getFamilyMembers, addFamilyMember, updateFamilyMemberColor, updateFamilyMember, deleteFamilyMember } from '$lib/server/queries/family.js';

describe('getFamilyMembers', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns an empty array when no members exist', async () => {
		const rows = await getFamilyMembers(db);
		expect(rows).toEqual([]);
	});

	it('returns members sorted by name ascending', async () => {
		await addFamilyMember(db, 'Charlie', 'red');
		await addFamilyMember(db, 'Alice', 'blue');
		await addFamilyMember(db, 'Bob', 'green');
		const rows = await getFamilyMembers(db);
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
	});
});

describe('addFamilyMember', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('creates a member with the given name and color', async () => {
		await addFamilyMember(db, 'Alice', 'purple');
		const rows = await getFamilyMembers(db);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Alice');
		expect(rows[0].color).toBe('purple');
	});

	it('uses blue as the default color', async () => {
		await addFamilyMember(db, 'Alice');
		const [row] = await getFamilyMembers(db);
		expect(row.color).toBe('blue');
	});
});

describe('updateFamilyMemberColor', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('updates only the color, leaving name unchanged', async () => {
		const member = await makeMember(db, 'Alice', 'blue');
		await updateFamilyMemberColor(db, member.id, 'red');
		const [row] = await getFamilyMembers(db);
		expect(row.name).toBe('Alice');
		expect(row.color).toBe('red');
	});
});

describe('updateFamilyMember', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('updates both name and color', async () => {
		const member = await makeMember(db, 'Alice', 'blue');
		await updateFamilyMember(db, member.id, { name: 'Alicia', color: 'red' });
		const [row] = await getFamilyMembers(db);
		expect(row.name).toBe('Alicia');
		expect(row.color).toBe('red');
	});
});

describe('deleteFamilyMember', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('removes the row for the given id', async () => {
		const member = await makeMember(db, 'Alice');
		await deleteFamilyMember(db, member.id);
		const rows = await getFamilyMembers(db);
		expect(rows).toHaveLength(0);
	});

	it('does not remove other members', async () => {
		const alice = await makeMember(db, 'Alice');
		await makeMember(db, 'Bob');
		await deleteFamilyMember(db, alice.id);
		const rows = await getFamilyMembers(db);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Bob');
	});
});
