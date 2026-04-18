import { getLists, createList, deleteList, addListItem, checkListItem, restoreListItem } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export async function load({ cookies }) {
	const memberId = Number(cookies.get('member_id') || 0) || null;
	return { lists: await getLists(), memberId };
}

export const actions = {
	create: async ({ request, cookies }) => {
		const memberId = Number(cookies.get('member_id') || 0) || null;
		const data = await request.formData();
		const title = (data.get('title') ?? '').toString().trim();
		if (!title) return fail(400, { error: 'Title is required' });
		await createList({ title, created_by: memberId });
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) return fail(400, { error: 'Missing id' });
		await deleteList(Number(id));
		return { success: true };
	},

	addItem: async ({ request }) => {
		const data = await request.formData();
		const list_id = Number(data.get('list_id'));
		const item = (data.get('item') ?? '').toString().trim();
		if (!item) return fail(400, { error: 'Item text is required' });
		await addListItem({ list_id, item });
		return { success: true };
	},

	checkItem: async ({ request }) => {
		const data = await request.formData();
		const item_id = Number(data.get('item_id'));
		await checkListItem(item_id);
		return { success: true };
	},

	restoreItem: async ({ request }) => {
		const data = await request.formData();
		const item_id = Number(data.get('item_id'));
		await restoreListItem(item_id);
		return { success: true };
	}
};
