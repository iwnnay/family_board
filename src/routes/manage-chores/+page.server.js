import { getChores, addChore, updateChore, deleteChore, getChoreById } from '$lib/server/db';
import { saveChoreImage, deleteChoreImage } from '$lib/server/images.js';
import { fail } from '@sveltejs/kit';

export async function load() {
	return { chores: await getChores() };
}

export const actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		const name = (data.get('name') ?? '').toString().trim();
		const frequency = data.get('frequency') ?? 'none';
		const suggested_day = (data.get('suggested_day') ?? '').toString().trim();
		const removeImage = data.get('remove_image') === '1';
		const file = data.get('image');
		const hasNewFile = file instanceof File && file.size > 0;

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		if (id) {
			const existing = await getChoreById(Number(id));
			let image = undefined; // undefined = leave the image column untouched

			if (removeImage) {
				await deleteChoreImage(existing?.image);
				image = null;
			} else if (hasNewFile) {
				await deleteChoreImage(existing?.image);
				image = await saveChoreImage(file);
			}

			await updateChore(Number(id), name, frequency, suggested_day, image);
		} else {
			const image = hasNewFile ? await saveChoreImage(file) : null;
			await addChore(name, frequency, suggested_day, image);
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (id) {
			await deleteChoreImage((await getChoreById(Number(id)))?.image);
			await deleteChore(Number(id));
		}
		return { success: true };
	}
};
