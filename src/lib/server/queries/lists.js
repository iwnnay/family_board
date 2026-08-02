import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { lists, list_items, list_item_steps, user_pins, family } from '../schema/index.js';
import { toUtcString } from '$lib/time.js';
import { sortListItems } from '$lib/list-items.js';

/** rel_type used for list favourites in the shared user_pins table. */
const FAVORITE_TYPE = 'list';

function nowStr() {
	return toUtcString();
}

/** Bump a list's updated_at so recently-touched lists float up. */
async function touchList(db, list_id) {
	if (list_id) {
		await db.update(lists).set({ updated_at: nowStr() }).where(eq(lists.id, list_id));
	}
}

async function listIdOfItem(db, item_id) {
	const [row] = await db.select({ list_id: list_items.list_id }).from(list_items).where(eq(list_items.id, item_id));
	return row?.list_id ?? null;
}

/**
 * Every list with its items split into active/completed.
 *
 * Active items are ordered by due date, then priority, then insertion order;
 * completed items by most recently completed. Passing `memberId` marks that
 * member's favourites and floats them to the top.
 */
export async function getLists(db, memberId = null) {
	const allLists = await db.select().from(lists).orderBy(desc(lists.updated_at));
	const allItems = await db.select().from(list_items).orderBy(asc(list_items.id));
	const allSteps = await db.select().from(list_item_steps).orderBy(asc(list_item_steps.sort_order), asc(list_item_steps.id));
	const members = await db.select({ id: family.id, name: family.name, color: family.color }).from(family);

	const memberById = new Map(members.map((m) => [m.id, m]));

	const stepsByItem = new Map();
	for (const step of allSteps) {
		const bucket = stepsByItem.get(step.item_id);
		if (bucket) {
			bucket.push(step);
		} else {
			stepsByItem.set(step.item_id, [step]);
		}
	}

	let favoriteIds = new Set();
	if (memberId) {
		const pins = await db
			.select({ rel_id: user_pins.rel_id })
			.from(user_pins)
			.where(and(eq(user_pins.user_id, memberId), eq(user_pins.rel_type, FAVORITE_TYPE)));
		favoriteIds = new Set(pins.map((p) => p.rel_id));
	}

	const decorate = (item) => ({
		...item,
		priority: item.priority ?? 'none',
		steps: stepsByItem.get(item.id) ?? [],
		assignee: item.assigned_to ? (memberById.get(item.assigned_to) ?? null) : null
	});

	const decorated = allLists.map((list) => {
		const items = allItems.filter((i) => i.list_id === list.id).map(decorate);
		return {
			...list,
			favorite: favoriteIds.has(list.id),
			active_items: sortListItems(items.filter((i) => !i.completed_at)),
			completed_items: items.filter((i) => i.completed_at).sort((a, b) => b.completed_at.localeCompare(a.completed_at))
		};
	});

	// Favourites first, each group keeping the updated_at ordering above.
	return [...decorated.filter((l) => l.favorite), ...decorated.filter((l) => !l.favorite)];
}

export async function createList(db, { title, created_by }) {
	const now = nowStr();
	const [result] = await db.insert(lists).values({ title, created_by, created_at: now, updated_at: now }).returning({ id: lists.id });
	return result.id;
}

/**
 * Deletes a list; items and steps cascade.
 * Returns the image filenames that belonged to its items so the caller can
 * remove the files from disk.
 */
export async function deleteList(db, id) {
	const images = await db.select({ image: list_items.image }).from(list_items).where(eq(list_items.list_id, id));
	await db.delete(lists).where(eq(lists.id, id));
	return images.map((r) => r.image).filter(Boolean);
}

/**
 * Favourite / unfavourite a list for one family member.
 * @returns {Promise<boolean>} the resulting state (true = favourited)
 */
export async function toggleListFavorite(db, memberId, listId) {
	const [existing] = await db
		.select({ id: user_pins.id })
		.from(user_pins)
		.where(and(eq(user_pins.user_id, memberId), eq(user_pins.rel_id, listId), eq(user_pins.rel_type, FAVORITE_TYPE)));

	if (existing) {
		await db.delete(user_pins).where(eq(user_pins.id, existing.id));
		return false;
	}
	await db.insert(user_pins).values({ user_id: memberId, rel_id: listId, rel_type: FAVORITE_TYPE, is_global: 0 });
	return true;
}

export async function getListItem(db, item_id) {
	const [row] = await db.select().from(list_items).where(eq(list_items.id, item_id));
	if (!row) {
		return null;
	}
	const steps = await db.select().from(list_item_steps).where(eq(list_item_steps.item_id, item_id)).orderBy(asc(list_item_steps.sort_order), asc(list_item_steps.id));
	return { ...row, steps };
}

export async function addListItem(db, { list_id, item, due_date = null, priority = 'none', notes = null, assigned_to = null, created_by = null }) {
	const [result] = await db
		.insert(list_items)
		.values({
			list_id,
			item,
			due_date,
			priority: priority || 'none',
			notes,
			// An item is assigned to whoever added it unless told otherwise.
			assigned_to: assigned_to ?? created_by,
			created_by,
			created_at: nowStr()
		})
		.returning({ id: list_items.id });
	await touchList(db, list_id);
	return result.id;
}

/**
 * Partial update — only the keys present in `fields` are written, so callers
 * can change one attribute without clobbering the rest. Pass `image: null` to
 * clear the photo, or omit `image` to leave it alone.
 *
 * Passing `list_id` moves the item to another list, and touches both lists.
 */
export async function updateListItem(db, item_id, fields = {}) {
	const allowed = ['item', 'due_date', 'priority', 'notes', 'assigned_to', 'image', 'list_id'];
	const patch = {};
	for (const key of allowed) {
		if (key in fields && fields[key] !== undefined) {
			patch[key] = fields[key];
		}
	}
	if (Object.keys(patch).length === 0) {
		return;
	}

	const previousListId = await listIdOfItem(db, item_id);
	await db.update(list_items).set(patch).where(eq(list_items.id, item_id));
	await touchList(db, previousListId);
	if (patch.list_id && patch.list_id !== previousListId) {
		await touchList(db, patch.list_id);
	}
}

/** Deletes an item and returns its image filename (or null) for cleanup. */
export async function deleteListItem(db, item_id) {
	const [row] = await db.select({ list_id: list_items.list_id, image: list_items.image }).from(list_items).where(eq(list_items.id, item_id));
	await db.delete(list_items).where(eq(list_items.id, item_id));
	await touchList(db, row?.list_id);
	return row?.image ?? null;
}

export async function checkListItem(db, item_id) {
	const list_id = await listIdOfItem(db, item_id);
	await db.update(list_items).set({ completed_at: nowStr() }).where(eq(list_items.id, item_id));
	await touchList(db, list_id);
}

export async function restoreListItem(db, item_id) {
	const list_id = await listIdOfItem(db, item_id);
	await db.update(list_items).set({ completed_at: null }).where(eq(list_items.id, item_id));
	await touchList(db, list_id);
}

/**
 * Replaces an item's steps with `steps` ([{ step, done }]), preserving the
 * given order. Completion is carried on the payload rather than merged by id,
 * so the edit form is the single source of truth for the whole step list.
 */
export async function setListItemSteps(db, item_id, steps = []) {
	const now = nowStr();
	await db.delete(list_item_steps).where(eq(list_item_steps.item_id, item_id));

	const rows = steps
		.map((s, i) => ({
			item_id,
			step: (s.step ?? '').toString().trim(),
			completed_at: s.done ? (s.completed_at ?? now) : null,
			sort_order: i
		}))
		.filter((s) => s.step);

	if (rows.length > 0) {
		await db.insert(list_item_steps).values(rows);
	}
	await touchList(db, await listIdOfItem(db, item_id));
}

/** Check/uncheck a single step without opening the edit form. */
export async function toggleListItemStep(db, step_id) {
	const [step] = await db.select().from(list_item_steps).where(eq(list_item_steps.id, step_id));
	if (!step) {
		return;
	}
	await db
		.update(list_item_steps)
		.set({ completed_at: step.completed_at ? null : nowStr() })
		.where(eq(list_item_steps.id, step_id));
	await touchList(db, await listIdOfItem(db, step.item_id));
}

/** Image filenames for a set of lists — used when deleting several at once. */
export async function getListImages(db, listIds = []) {
	if (listIds.length === 0) {
		return [];
	}
	const rows = await db.select({ image: list_items.image }).from(list_items).where(inArray(list_items.list_id, listIds));
	return rows.map((r) => r.image).filter(Boolean);
}
