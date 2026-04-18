import { getChoresWithStatus, completeChore, getRecentEvents } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export async function load() {
	const [chores, events] = await Promise.all([getChoresWithStatus(), getRecentEvents()]);
	return { chores, events };
}

export const actions = {
	complete: async ({ request, cookies }) => {
		const data = await request.formData();
		const chore_id = Number(data.get('chore_id'));
		const member_id_from_form = data.get('member_id');

		let member_id = Number(cookies.get('member_id') || member_id_from_form);

		if (!member_id) {
			return fail(400, { error: 'No family member selected' });
		}

		if (member_id_from_form) {
			cookies.set('member_id', String(member_id_from_form), { path: '/', maxAge: 60 * 60 * 24 * 365 });
			member_id = Number(member_id_from_form);
		}

		await completeChore(chore_id, member_id);
		return { success: true };
	},

	selectMember: async ({ request, cookies }) => {
		const data = await request.formData();
		const member_id = data.get('member_id');

		if (member_id) {
			cookies.set('member_id', String(member_id), { path: '/', maxAge: 60 * 60 * 24 * 365 });
		} else {
			cookies.delete('member_id', { path: '/' });
		}

		return { success: true };
	}
};
