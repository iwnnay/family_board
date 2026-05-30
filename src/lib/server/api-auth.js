import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';

/**
 * Bearer-token guard shared by every /api endpoint.
 *
 * A token MUST be configured via CALENDAR_API_TOKEN. The feed is never open:
 * when the token is unset the endpoint denies all requests, and otherwise the
 * caller must supply the matching token via `Authorization: Bearer <token>`
 * or `?token=<token>`.
 *
 * @returns {Response|null} a 503/401 Response to return as-is, or null when authorized.
 */
export function checkApiToken(request, url) {
	const expected = process.env.CALENDAR_API_TOKEN;
	if (!expected) {
		// Misconfiguration — fail loudly in logs, deny the request.
		console.warn('[api] CALENDAR_API_TOKEN is not set; denying API request');
		return json({ error: 'API not configured' }, { status: 503 });
	}

	const header = request.headers.get('authorization') ?? '';
	const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
	const supplied = bearer || url.searchParams.get('token') || '';

	if (!supplied || !safeEqual(supplied, expected)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	return null;
}

/** Constant-time string comparison (returns false on length mismatch). */
function safeEqual(a, b) {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) {
		return false;
	}
	return timingSafeEqual(ab, bb);
}
