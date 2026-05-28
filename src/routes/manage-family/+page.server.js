import { getFamilyMembers, addFamilyMember, updateFamilyMemberColor, deleteFamilyMember } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user?.is_admin) {
		throw redirect(302, '/');
	}
	return { family: await getFamilyMembers() };
}

export const actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') ?? '').toString().trim();
		const color = (data.get('color') ?? '').toString() || 'blue';
		if (!name) {
			return fail(400, { error: 'Name is required' });
		}
		await addFamilyMember(name, color);
		return { success: true };
	},

	setColor: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const color = (data.get('color') ?? '').toString();
		if (id && color) {
			await updateFamilyMemberColor(id, color);
		}
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (id) {
			await deleteFamilyMember(Number(id));
		}
		return { success: true };
	}
};
