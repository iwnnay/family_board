import { getLocations, createLocation, updateLocation, deleteLocation } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export async function load() {
	return { locations: await getLocations() };
}

export const actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		const name = (data.get('name') ?? '').toString().trim();
		const address = (data.get('address') ?? '').toString().trim();

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		if (id) {
			await updateLocation(Number(id), { name, address });
		} else {
			await createLocation({ name, address });
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		await deleteLocation(Number(id));
		return { success: true };
	}
};
