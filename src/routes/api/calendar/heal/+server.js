import { json } from '@sveltejs/kit';
import { healCalendarSeries } from '$lib/server/db';
import { checkApiToken } from '$lib/server/api-auth.js';

/**
 * Rolls every recurring series forward to the +2-year horizon, materialising
 * any missing occurrences. Idempotent — safe to call repeatedly.
 *
 *   GET  /api/calendar/heal      (convenient for a browser / simple cron)
 *   POST /api/calendar/heal
 *
 * Requires the CALENDAR_API_TOKEN bearer token (see checkApiToken). Wire a
 * monthly host cron to hit this; writes also top up series opportunistically.
 */

async function run(request, url) {
	const denied = checkApiToken(request, url);
	if (denied) {
		return denied;
	}
	const result = await healCalendarSeries();
	return json({ ok: true, ...result });
}

export const GET = ({ request, url }) => run(request, url);
export const POST = ({ request, url }) => run(request, url);
