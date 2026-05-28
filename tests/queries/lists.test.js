import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeMember } from '../helpers.js';
import { list_items, lists as listsTable } from '$lib/server/schema/sqlite.js';
import { createList, getLists, addListItem, checkListItem, restoreListItem, deleteList } from '$lib/server/queries/lists.js';

describe('createList', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('returns a numeric id and the list appears in getLists', async () => {
		const id = await createList(db, { title: 'Groceries', created_by: memberId });
		expect(id).toBeTypeOf('number');

		const all = await getLists(db);
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(id);
		expect(all[0].title).toBe('Groceries');
	});
});

describe('getLists', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('partitions items into active_items and completed_items', async () => {
		const listId = await createList(db, { title: 'Shopping', created_by: memberId });
		await addListItem(db, { list_id: listId, item: 'milk' });
		await addListItem(db, { list_id: listId, item: 'eggs' });
		await addListItem(db, { list_id: listId, item: 'bread' });

		// Check 'eggs' as complete
		const [eggsRow] = await db.select().from(list_items).where(eq(list_items.item, 'eggs'));
		await checkListItem(db, eggsRow.id);

		const all = await getLists(db);
		expect(all).toHaveLength(1);
		const list = all[0];
		expect(list.active_items).toHaveLength(2);
		expect(list.completed_items).toHaveLength(1);
		expect(list.active_items.map((i) => i.item).sort()).toEqual(['bread', 'milk']);
		expect(list.completed_items[0].item).toBe('eggs');
	});
});

describe('addListItem', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('adds an item with no completed_at', async () => {
		const listId = await createList(db, { title: 'L', created_by: memberId });
		await addListItem(db, { list_id: listId, item: 'apples' });

		const rows = await db.select().from(list_items).where(eq(list_items.list_id, listId));
		expect(rows).toHaveLength(1);
		expect(rows[0].item).toBe('apples');
		expect(rows[0].completed_at).toBeNull();
	});
});

describe('checkListItem', () => {
	let db;
	let memberId;
	let listId;
	let itemId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		listId = await createList(db, { title: 'L', created_by: memberId });
		await addListItem(db, { list_id: listId, item: 'apples' });
		const [row] = await db.select().from(list_items).where(eq(list_items.list_id, listId));
		itemId = row.id;
	});

	it('moves the item to completed by setting completed_at', async () => {
		await checkListItem(db, itemId);
		const [row] = await db.select().from(list_items).where(eq(list_items.id, itemId));
		expect(row.completed_at).not.toBeNull();
	});
});

describe('restoreListItem', () => {
	let db;
	let memberId;
	let itemId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		const listId = await createList(db, { title: 'L', created_by: memberId });
		await addListItem(db, { list_id: listId, item: 'apples' });
		const [row] = await db.select().from(list_items).where(eq(list_items.list_id, listId));
		itemId = row.id;
		await checkListItem(db, itemId);
	});

	it('clears completed_at to move the item back to active', async () => {
		await restoreListItem(db, itemId);
		const [row] = await db.select().from(list_items).where(eq(list_items.id, itemId));
		expect(row.completed_at).toBeNull();
	});
});

describe('deleteList', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('removes the list and cascades its items', async () => {
		const listId = await createList(db, { title: 'L', created_by: memberId });
		await addListItem(db, { list_id: listId, item: 'apples' });
		await addListItem(db, { list_id: listId, item: 'bread' });

		await deleteList(db, listId);

		const remainingLists = await db.select().from(listsTable).where(eq(listsTable.id, listId));
		expect(remainingLists).toHaveLength(0);

		const remainingItems = await db.select().from(list_items).where(eq(list_items.list_id, listId));
		expect(remainingItems).toHaveLength(0);
	});
});
