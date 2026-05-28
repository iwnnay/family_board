import { getFamilyMembers, addFamilyMember, updateFamilyMemberColor, deleteFamilyMember } from '$lib/server/db';
import { requireAdmin, parseTrimmed, parseString, parseNumber, badRequest } from '$lib/server/form-utils.js';

export async function load({ locals }) {
	requireAdmin(locals);
	return { family: await getFamilyMembers() };
}

export const actions = {
	add: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const name = parseTrimmed(data, 'name');
		const color = parseString(data, 'color') || 'blue';
		if (!name) {return badRequest('Name is required');}
		await addFamilyMember(name, color);
		return { success: true };
	},

	setColor: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = parseNumber(data, 'id');
		const color = parseString(data, 'color');
		if (id && color) {await updateFamilyMemberColor(id, color);}
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = parseNumber(data, 'id');
		if (id) {await deleteFamilyMember(id);}
		return { success: true };
	}
};
