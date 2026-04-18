import { eq, desc, asc } from 'drizzle-orm';
import { lists, list_items } from '../schema/index.js';

function nowStr() {
	return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export async function getLists(db) {
	const allLists = await db.select().from(lists).orderBy(desc(lists.updated_at));
	const allItems = await db.select().from(list_items).orderBy(asc(list_items.id));

	return allLists.map((list) => {
		const items = allItems.filter((i) => i.list_id === list.id);
		return {
			...list,
			active_items: items.filter((i) => !i.completed_at),
			completed_items: items
				.filter((i) => i.completed_at)
				.sort((a, b) => b.completed_at.localeCompare(a.completed_at))
		};
	});
}

export async function createList(db, { title, created_by }) {
	const now = nowStr();
	const [result] = await db
		.insert(lists)
		.values({ title, created_by, created_at: now, updated_at: now })
		.returning({ id: lists.id });
	return result.id;
}

export async function deleteList(db, id) {
	await db.delete(lists).where(eq(lists.id, id));
}

export async function addListItem(db, { list_id, item }) {
	const now = nowStr();
	await db.insert(list_items).values({ list_id, item });
	await db.update(lists).set({ updated_at: now }).where(eq(lists.id, list_id));
}

export async function checkListItem(db, item_id) {
	const now = nowStr();
	const [row] = await db
		.select({ list_id: list_items.list_id })
		.from(list_items)
		.where(eq(list_items.id, item_id));
	await db.update(list_items).set({ completed_at: now }).where(eq(list_items.id, item_id));
	if (row) {
		await db.update(lists).set({ updated_at: now }).where(eq(lists.id, row.list_id));
	}
}

export async function restoreListItem(db, item_id) {
	const now = nowStr();
	const [row] = await db
		.select({ list_id: list_items.list_id })
		.from(list_items)
		.where(eq(list_items.id, item_id));
	await db.update(list_items).set({ completed_at: null }).where(eq(list_items.id, item_id));
	if (row) {
		await db.update(lists).set({ updated_at: now }).where(eq(lists.id, row.list_id));
	}
}
