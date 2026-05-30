import { getCalendarEntries, getLocations, createCalendarEntry, updateCalendarEntry, deleteCalendarEntry, duplicateCalendarEntry, createLocation, healCalendarSeries } from '$lib/server/db';
import { toUtcString } from '$lib/time.js';
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
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayStr = toUtcString(startOfDay);
	const stripTo = toUtcString(threeMonthsOut);

	const [entries, stripEntries, locations] = await Promise.all([getCalendarEntries({ from, to }), getCalendarEntries({ from: todayStr, to: stripTo }), getLocations()]);

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
		const description = (data.get('description') ?? '').toString().trim() || null;
		const all_day = data.get('all_day') === 'on' || data.get('all_day') === '1';
		const recurrence = (data.get('recurrence') ?? 'none').toString();
		// Only meaningful for recurring events; an empty input means "forever".
		const recurrence_end = recurrence === 'none' ? null : (data.get('recurrence_end') ?? '').toString() || null;

		if (!title) {
			return fail(400, { error: 'Title is required' });
		}

		let start_time;
		let end_time;
		if (all_day) {
			// All-day dates are floating (no timezone): store the picked date(s) verbatim.
			const date = (data.get('all_day_date') ?? '').toString();
			if (!date) {
				return fail(400, { error: 'Date is required' });
			}
			const endDate = (data.get('all_day_end_date') ?? '').toString() || date;
			start_time = `${date} 00:00:00`;
			end_time = `${endDate} 00:00:00`;
		} else {
			// The datetime-local input sends 'YYYY-MM-DDTHH:MM' parsed as local time;
			// toUtcString converts to UTC for storage.
			const start_input = (data.get('start_time') ?? '').toString();
			if (!start_input) {
				return fail(400, { error: 'Start time is required' });
			}
			const duration_minutes = Number(data.get('duration_minutes') || 60);
			const start = new Date(start_input);
			const end = new Date(start.getTime() + duration_minutes * 60000);
			start_time = toUtcString(start);
			end_time = toUtcString(end);
		}

		const fields = { title, location_id, start_time, end_time, description, all_day: all_day ? 1 : 0, recurrence, recurrence_end };

		if (id) {
			await updateCalendarEntry(Number(id), fields);
		} else {
			await createCalendarEntry({ ...fields, created_by: memberId });
		}

		// Self-healing: a write is a good moment to roll every series' horizon
		// forward. Cheap when nothing is due; the cron endpoint is the backstop.
		await healCalendarSeries();

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
	}
};
