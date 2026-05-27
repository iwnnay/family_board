import { getChoresWithStatus, completeChore, getRecentEvents, getCalendarEntries, getCalendarEntryById } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export async function load() {
	const now = new Date();
	const threeMonthsOut = new Date(now);
	threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
	const todayStr = now.toISOString().replace('T', ' ').substring(0, 10) + ' 00:00:00';
	const stripTo = threeMonthsOut.toISOString().replace('T', ' ').substring(0, 19);

	const [chores, events, calendarEntries] = await Promise.all([getChoresWithStatus(), getRecentEvents(), getCalendarEntries({ from: todayStr, to: stripTo })]);
	return { chores, events, calendarEntries };
}

export const actions = {
	loadCalendarEntry: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		const entry = await getCalendarEntryById(Number(id));
		return { entry };
	},

	complete: async ({ request, cookies }) => {
		const data = await request.formData();
		const chore_id = Number(data.get('chore_id'));
		const member_id_from_form = data.get('member_id');

		let member_id = Number(cookies.get('member_id') || member_id_from_form);

		if (!member_id) {
			return fail(400, { error: 'No family member selected' });
		}

		if (member_id_from_form) {
			cookies.set('member_id', String(member_id_from_form), { path: '/', maxAge: 60 * 60 * 24 * 365, secure: false });
			member_id = Number(member_id_from_form);
		}

		await completeChore(chore_id, member_id);
		return { success: true };
	},

	selectMember: async ({ request, cookies }) => {
		const data = await request.formData();
		const member_id = data.get('member_id');

		if (member_id) {
			cookies.set('member_id', String(member_id), { path: '/', maxAge: 60 * 60 * 24 * 365, secure: false });
		} else {
			cookies.delete('member_id', { path: '/', secure: false });
		}

		return { success: true };
	}
};
