import {
	getLists,
	createList,
	deleteList,
	toggleListFavorite,
	getListItem,
	addListItem,
	updateListItem,
	deleteListItem,
	checkListItem,
	restoreListItem,
	setListItemSteps,
	toggleListItemStep
} from '$lib/server/db';
import { saveListItemImage, deleteListItemImage, deleteListItemImages, isUsableUpload, MAX_UPLOAD_BYTES } from '$lib/server/images.js';
import { parseDueDate } from '$lib/due-date.js';
import { PRIORITIES } from '$lib/list-items.js';
import { parseTrimmed, parseNumber, badRequest } from '$lib/server/form-utils.js';
import { fail } from '@sveltejs/kit';

const PRIORITY_KEYS = PRIORITIES.map((p) => p.key);

/** The family member acting on this request, or null when unlinked. */
function actingMemberId(locals) {
	return locals.currentMember?.id ?? null;
}

/** Normalise a priority coming off a form to a known key. */
function parsePriority(data) {
	const value = parseTrimmed(data, 'priority');
	return PRIORITY_KEYS.includes(value) ? value : 'none';
}

/** 'YYYY-MM-DD' or null — anything else is treated as "no due date". */
function parseDueDateField(data) {
	const value = parseTrimmed(data, 'due_date');
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Optional family member id; '' / 0 mean unassigned. */
function parseMemberField(data, key) {
	const value = parseNumber(data, key);
	return value > 0 ? value : null;
}

/**
 * Steps arrive as parallel `step_text` / `step_done` field lists, which keeps
 * their order and completion state together without per-row field names.
 */
function parseSteps(data) {
	const texts = data.getAll('step_text');
	const done = data.getAll('step_done');
	return texts.map((step, i) => ({ step: step.toString(), done: done[i]?.toString() === '1' })).filter((s) => s.step.trim());
}

export async function load({ locals }) {
	const memberId = actingMemberId(locals);
	return { lists: await getLists(memberId), memberId };
}

export const actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const title = parseTrimmed(data, 'title');
		if (!title) {
			return badRequest('Title is required');
		}
		await createList({ title, created_by: actingMemberId(locals) });
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = parseNumber(data, 'id');
		if (!id) {
			return badRequest('Missing id');
		}
		// Items cascade in the DB; their uploaded photos have to go too.
		const images = await deleteList(id);
		await deleteListItemImages(images);
		return { success: true };
	},

	favorite: async ({ request, locals }) => {
		const memberId = actingMemberId(locals);
		if (!memberId) {
			return badRequest('Only family members can favorite a list');
		}
		const data = await request.formData();
		const id = parseNumber(data, 'id');
		if (!id) {
			return badRequest('Missing id');
		}
		await toggleListFavorite(memberId, id);
		return { success: true };
	},

	addItem: async ({ request, locals }) => {
		const data = await request.formData();
		const list_id = parseNumber(data, 'list_id');
		const raw = parseTrimmed(data, 'item');
		if (!raw) {
			return badRequest('Item text is required');
		}

		// "Clean the gutter by Thursday" → item "Clean the gutter", due Thursday.
		const { text, dueDate } = parseDueDate(raw);

		await addListItem({
			list_id,
			item: text,
			due_date: dueDate,
			created_by: actingMemberId(locals)
		});
		return { success: true };
	},

	updateItem: async ({ request }) => {
		const data = await request.formData();
		const item_id = parseNumber(data, 'item_id');
		const item = parseTrimmed(data, 'item');
		if (!item_id) {
			return badRequest('Missing item');
		}
		if (!item) {
			return badRequest('Item text is required');
		}

		const existing = await getListItem(item_id);
		if (!existing) {
			return fail(404, { error: 'Item not found' });
		}

		const file = data.get('image');
		const removeImage = data.get('remove_image') === '1';
		let image; // undefined = leave the column untouched

		if (file instanceof File && file.size > MAX_UPLOAD_BYTES) {
			return badRequest('Image must be 5 MB or smaller');
		}
		if (isUsableUpload(file)) {
			await deleteListItemImage(existing.image);
			image = await saveListItemImage(file);
		} else if (removeImage) {
			await deleteListItemImage(existing.image);
			image = null;
		}

		const targetList = parseNumber(data, 'list_id');

		await updateListItem(item_id, {
			item,
			due_date: parseDueDateField(data),
			priority: parsePriority(data),
			notes: parseTrimmed(data, 'notes') || null,
			assigned_to: parseMemberField(data, 'assigned_to'),
			list_id: targetList > 0 ? targetList : undefined,
			image
		});
		await setListItemSteps(item_id, parseSteps(data));

		return { success: true };
	},

	deleteItem: async ({ request }) => {
		const data = await request.formData();
		const item_id = parseNumber(data, 'item_id');
		if (!item_id) {
			return badRequest('Missing item');
		}
		await deleteListItemImage(await deleteListItem(item_id));
		return { success: true };
	},

	checkItem: async ({ request }) => {
		const data = await request.formData();
		await checkListItem(parseNumber(data, 'item_id'));
		return { success: true };
	},

	restoreItem: async ({ request }) => {
		const data = await request.formData();
		await restoreListItem(parseNumber(data, 'item_id'));
		return { success: true };
	},

	toggleStep: async ({ request }) => {
		const data = await request.formData();
		await toggleListItemStep(parseNumber(data, 'step_id'));
		return { success: true };
	}
};
