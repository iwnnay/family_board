import { getFamilyMembers, addFamilyMember, updateFamilyMemberColor, deleteFamilyMember } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export function load() {
	return { family: getFamilyMembers() };
}

export const actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') ?? '').toString().trim();
		const color = (data.get('color') ?? '').toString() || 'blue';
		if (!name) return fail(400, { error: 'Name is required' });
		addFamilyMember(name, color);
		return { success: true };
	},

	setColor: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const color = (data.get('color') ?? '').toString();
		if (id && color) updateFamilyMemberColor(id, color);
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (id) deleteFamilyMember(Number(id));
		return { success: true };
	}
};
