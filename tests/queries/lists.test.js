import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeMember } from '../helpers.js';
import { list_items, list_item_steps, lists as listsTable } from '$lib/server/schema/sqlite.js';
import {
	createList,
	getLists,
	addListItem,
	updateListItem,
	deleteListItem,
	getListItem,
	checkListItem,
	restoreListItem,
	deleteList,
	toggleListFavorite,
	setListItemSteps,
	toggleListItemStep,
	getListImages
} from '$lib/server/queries/lists.js';

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

	it('orders active items by due date, then priority, then insertion order', async () => {
		const listId = await createList(db, { title: 'Chores', created_by: memberId });
		await addListItem(db, { list_id: listId, item: 'no date, low', priority: 'low' });
		await addListItem(db, { list_id: listId, item: 'no date, high', priority: 'high' });
		await addListItem(db, { list_id: listId, item: 'later', due_date: '2026-09-01', priority: 'high' });
		await addListItem(db, { list_id: listId, item: 'sooner', due_date: '2026-08-05', priority: 'none' });

		const [list] = await getLists(db);
		expect(list.active_items.map((i) => i.item)).toEqual(['sooner', 'later', 'no date, high', 'no date, low']);
	});

	it('attaches steps and the assigned family member to each item', async () => {
		const bob = await makeMember(db, 'Bob');
		const listId = await createList(db, { title: 'Trip', created_by: memberId });
		const itemId = await addListItem(db, { list_id: listId, item: 'Pack', assigned_to: bob.id });
		await setListItemSteps(db, itemId, [{ step: 'socks' }, { step: 'shoes', done: true }]);

		const [list] = await getLists(db);
		const [item] = list.active_items;
		expect(item.assignee).toMatchObject({ id: bob.id, name: 'Bob' });
		expect(item.steps.map((s) => s.step)).toEqual(['socks', 'shoes']);
		expect(item.steps[0].completed_at).toBeNull();
		expect(item.steps[1].completed_at).not.toBeNull();
	});

	it('floats a member’s favorites to the top and flags them', async () => {
		const first = await createList(db, { title: 'First', created_by: memberId });
		const second = await createList(db, { title: 'Second', created_by: memberId });
		await toggleListFavorite(db, memberId, first);

		const withMember = await getLists(db, memberId);
		expect(withMember.map((l) => l.id)).toEqual([first, second]);
		expect(withMember[0].favorite).toBe(true);
		expect(withMember[1].favorite).toBe(false);
	});

	it('does not leak one member’s favorites to another', async () => {
		const bob = await makeMember(db, 'Bob');
		const listId = await createList(db, { title: 'Mine', created_by: memberId });
		await toggleListFavorite(db, memberId, listId);

		const asBob = await getLists(db, bob.id);
		expect(asBob[0].favorite).toBe(false);
	});
});

describe('toggleListFavorite', () => {
	let db;
	let memberId;
	let listId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		listId = await createList(db, { title: 'L', created_by: memberId });
	});

	it('flips the favorite state on each call', async () => {
		expect(await toggleListFavorite(db, memberId, listId)).toBe(true);
		expect((await getLists(db, memberId))[0].favorite).toBe(true);

		expect(await toggleListFavorite(db, memberId, listId)).toBe(false);
		expect((await getLists(db, memberId))[0].favorite).toBe(false);
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
		expect(rows[0].priority).toBe('none');
	});

	it('assigns the item to whoever created it by default', async () => {
		const listId = await createList(db, { title: 'L', created_by: memberId });
		const itemId = await addListItem(db, { list_id: listId, item: 'apples', created_by: memberId });

		expect((await getListItem(db, itemId)).assigned_to).toBe(memberId);
	});

	it('honours an explicit assignee over the creator', async () => {
		const bob = await makeMember(db, 'Bob');
		const listId = await createList(db, { title: 'L', created_by: memberId });
		const itemId = await addListItem(db, { list_id: listId, item: 'apples', created_by: memberId, assigned_to: bob.id });

		expect((await getListItem(db, itemId)).assigned_to).toBe(bob.id);
	});

	it('stores due date, priority and notes', async () => {
		const listId = await createList(db, { title: 'L', created_by: memberId });
		const itemId = await addListItem(db, { list_id: listId, item: 'apples', due_date: '2026-08-06', priority: 'high', notes: 'granny smith' });

		expect(await getListItem(db, itemId)).toMatchObject({ due_date: '2026-08-06', priority: 'high', notes: 'granny smith' });
	});
});

describe('updateListItem', () => {
	let db;
	let memberId;
	let itemId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		const listId = await createList(db, { title: 'L', created_by: memberId });
		itemId = await addListItem(db, { list_id: listId, item: 'apples', notes: 'keep me' });
	});

	it('writes only the fields it is given', async () => {
		await updateListItem(db, itemId, { item: 'pears', priority: 'medium' });
		expect(await getListItem(db, itemId)).toMatchObject({ item: 'pears', priority: 'medium', notes: 'keep me' });
	});

	it('clears a value when passed null', async () => {
		await updateListItem(db, itemId, { notes: null });
		expect((await getListItem(db, itemId)).notes).toBeNull();
	});

	it('ignores undefined fields and unknown keys', async () => {
		await updateListItem(db, itemId, { item: undefined, bogus: 'x' });
		expect((await getListItem(db, itemId)).item).toBe('apples');
	});
});

describe('moving an item between lists', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('moves the item onto the target list', async () => {
		const from = await createList(db, { title: 'From', created_by: memberId });
		const to = await createList(db, { title: 'To', created_by: memberId });
		const itemId = await addListItem(db, { list_id: from, item: 'apples' });

		await updateListItem(db, itemId, { list_id: to });

		const all = await getLists(db);
		expect(all.find((l) => l.id === from).active_items).toHaveLength(0);
		expect(all.find((l) => l.id === to).active_items.map((i) => i.item)).toEqual(['apples']);
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

describe('steps', () => {
	let db;
	let itemId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		const listId = await createList(db, { title: 'L', created_by: member.id });
		itemId = await addListItem(db, { list_id: listId, item: 'Bake a cake' });
	});

	it('replaces the whole step list in the given order, dropping blanks', async () => {
		await setListItemSteps(db, itemId, [{ step: 'mix' }, { step: '   ' }, { step: 'bake' }]);
		expect((await getListItem(db, itemId)).steps.map((s) => s.step)).toEqual(['mix', 'bake']);

		await setListItemSteps(db, itemId, [{ step: 'frost' }]);
		expect((await getListItem(db, itemId)).steps.map((s) => s.step)).toEqual(['frost']);
	});

	it('records completion from the payload', async () => {
		await setListItemSteps(db, itemId, [{ step: 'mix', done: true }, { step: 'bake' }]);
		const { steps } = await getListItem(db, itemId);
		expect(steps[0].completed_at).not.toBeNull();
		expect(steps[1].completed_at).toBeNull();
	});

	it('toggles a single step on and off', async () => {
		await setListItemSteps(db, itemId, [{ step: 'mix' }]);
		const [step] = (await getListItem(db, itemId)).steps;

		await toggleListItemStep(db, step.id);
		expect((await getListItem(db, itemId)).steps[0].completed_at).not.toBeNull();

		await toggleListItemStep(db, step.id);
		expect((await getListItem(db, itemId)).steps[0].completed_at).toBeNull();
	});

	it('removes steps when their item is deleted', async () => {
		await setListItemSteps(db, itemId, [{ step: 'mix' }]);
		await deleteListItem(db, itemId);
		expect(await db.select().from(list_item_steps).where(eq(list_item_steps.item_id, itemId))).toHaveLength(0);
	});
});

describe('deleteListItem', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('returns the image filename so the caller can remove the file', async () => {
		const listId = await createList(db, { title: 'L', created_by: memberId });
		const withImage = await addListItem(db, { list_id: listId, item: 'photo' });
		await updateListItem(db, withImage, { image: 'abc.webp' });
		const withoutImage = await addListItem(db, { list_id: listId, item: 'plain' });

		expect(await deleteListItem(db, withImage)).toBe('abc.webp');
		expect(await deleteListItem(db, withoutImage)).toBeNull();
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

	it('returns every attached image filename so the files can be deleted too', async () => {
		const listId = await createList(db, { title: 'L', created_by: memberId });
		const a = await addListItem(db, { list_id: listId, item: 'a' });
		const b = await addListItem(db, { list_id: listId, item: 'b' });
		await addListItem(db, { list_id: listId, item: 'no photo' });
		await updateListItem(db, a, { image: 'a.webp' });
		await updateListItem(db, b, { image: 'b.webp' });

		expect((await deleteList(db, listId)).sort()).toEqual(['a.webp', 'b.webp']);
	});

	it('leaves images on other lists alone', async () => {
		const doomed = await createList(db, { title: 'Doomed', created_by: memberId });
		const kept = await createList(db, { title: 'Kept', created_by: memberId });
		const a = await addListItem(db, { list_id: doomed, item: 'a' });
		const b = await addListItem(db, { list_id: kept, item: 'b' });
		await updateListItem(db, a, { image: 'a.webp' });
		await updateListItem(db, b, { image: 'b.webp' });

		expect(await deleteList(db, doomed)).toEqual(['a.webp']);
		expect(await getListImages(db, [kept])).toEqual(['b.webp']);
	});
});
