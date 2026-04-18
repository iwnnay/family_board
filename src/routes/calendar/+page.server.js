import { getCalendarEntries, getCalendarEntryById, getLocations, createCalendarEntry, updateCalendarEntry, deleteCalendarEntry, duplicateCalendarEntry, createLocation } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

function monthRange(year, month) {
	const from = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
	const lastDay = new Date(year, month, 0).getDate();
	const to = `${year}-${String(month).padStart(2, '0')}-${lastDay} 23:59:59`;
	return { from, to };
}

export async function load({ url }) {
	const now = new Date();
	const year = Number(url.searchParams.get('year') || now.getFullYear());
	const month = Number(url.searchParams.get('month') || now.getMonth() + 1);

	const { from, to } = monthRange(year, month);
	const threeMonthsOut = new Date(now);
	threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
	const stripTo = threeMonthsOut.toISOString().replace('T', ' ').substring(0, 19);
	const todayStr = now.toISOString().replace('T', ' ').substring(0, 10) + ' 00:00:00';

	const [entries, stripEntries, locations] = await Promise.all([
		getCalendarEntries({ from, to }),
		getCalendarEntries({ from: todayStr, to: stripTo }),
		getLocations()
	]);

	return { entries, stripEntries, locations, year, month };
}

export const actions = {
	saveLocation: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') ?? '').toString().trim();
		const address = (data.get('address') ?? '').toString().trim();
		if (!name) {
			return fail(400, { error: 'Name is required' });
		}
		const id = await createLocation({ name, address });
		return { location: { id, name, address: address || null } };
	},

	save: async ({ request, cookies }) => {
		const memberId = Number(cookies.get('member_id') || 0) || null;
		const data = await request.formData();
		const id = data.get('id');
		const title = (data.get('title') ?? '').toString().trim();
		const location_id = Number(data.get('location_id') || 0) || null;
		const start_time = (data.get('start_time') ?? '').toString();
		const duration_minutes = Number(data.get('duration_minutes') || 60);
		const description = (data.get('description') ?? '').toString().trim() || null;

		if (!title) {
			return fail(400, { error: 'Title is required' });
		}
		if (!start_time) {
			return fail(400, { error: 'Start time is required' });
		}

		const start = new Date(start_time);
		const end = new Date(start.getTime() + duration_minutes * 60000);
		const fmt = (d) => d.toISOString().replace('T', ' ').substring(0, 19);

		if (id) {
			await updateCalendarEntry(Number(id), { title, location_id, start_time: fmt(start), end_time: fmt(end), description });
		} else {
			await createCalendarEntry({ title, location_id, start_time: fmt(start), end_time: fmt(end), description, created_by: memberId });
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		await deleteCalendarEntry(Number(id));
		return { success: true };
	},

	duplicate: async ({ request, cookies }) => {
		const memberId = Number(cookies.get('member_id') || 0) || null;
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		await duplicateCalendarEntry(Number(id), memberId);
		return { success: true };
	},

	loadEntry: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		const entry = await getCalendarEntryById(Number(id));
		return { entry };
	}
};
