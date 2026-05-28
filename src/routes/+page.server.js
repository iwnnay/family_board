import { getChoresWithStatus, completeChore, getRecentEvents, getCalendarEntries, getCalendarEntryById } from '$lib/server/db';
import { toUtcString } from '$lib/time.js';
import { fail } from '@sveltejs/kit';

export async function load() {
	const now = new Date();
	const threeMonthsOut = new Date(now);
	threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayStr = toUtcString(startOfDay);
	const stripTo = toUtcString(threeMonthsOut);

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

	complete: async ({ request, locals }) => {
		const data = await request.formData();
		const chore_id = Number(data.get('chore_id'));

		if (!locals.currentMember) {
			return fail(400, { error: 'No family member linked to your account' });
		}

		await completeChore(chore_id, locals.currentMember.id);
		return { success: true };
	}
};
