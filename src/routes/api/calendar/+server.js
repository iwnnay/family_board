import { json } from '@sveltejs/kit';
import { getCalendarEntries } from '$lib/server/db';
import { toUtcString } from '$lib/time.js';
import { checkApiToken } from '$lib/server/api-auth.js';

/**
 * Read-only calendar feed for external consumers (e.g. the hub display).
 *
 *   GET /api/calendar?days=14
 *   GET /api/calendar?from=2026-06-01&to=2026-06-30
 *
 * Requires the CALENDAR_API_TOKEN bearer token (see checkApiToken).
 * Returns occurrences with recurring events already expanded for the range.
 */

const MAX_DAYS = 366;

export async function GET({ request, url }) {
	const denied = checkApiToken(request, url);
	if (denied) {
		return denied;
	}

	// Resolve the window: explicit from/to win, otherwise today → today + days.
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	let from = fromParam ? normalizeBound(fromParam, false) : toUtcString(startOfToday);
	let to;
	if (toParam) {
		to = normalizeBound(toParam, true);
	} else {
		const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 14, 1), MAX_DAYS);
		const end = new Date(startOfToday);
		end.setDate(end.getDate() + days);
		to = toUtcString(end);
	}

	const entries = await getCalendarEntries({ from, to });

	const events = entries.map((e) => ({
		id: e.id,
		title: e.title,
		start_time: e.start_time,
		end_time: e.end_time,
		all_day: e.all_day ? 1 : 0,
		description: e.description,
		location_name: e.location_name,
		location_address: e.location_address,
		created_by: e.created_by,
		created_by_color: e.created_by_color,
		recurrence: e.recurrence ?? 'none',
		is_recurring: !!e.is_recurring
	}));

	return json(
		{ from, to, events },
		{
			headers: {
				// Read-only public feed; allow direct browser fetches too.
				'access-control-allow-origin': '*',
				'cache-control': 'public, max-age=60'
			}
		}
	);
}

/** Accept either a 'YYYY-MM-DD' date or a full storage string for a bound. */
function normalizeBound(value, isEnd) {
	const v = value.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
		return `${v} ${isEnd ? '23:59:59' : '00:00:00'}`;
	}
	return v;
}
