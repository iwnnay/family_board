import { redirect } from '@sveltejs/kit';
import { getSession, deleteExpiredSessions, getUserFamilyMember, hasAnyUsers } from '$lib/server/db';

const PUBLIC_PATHS = ['/login', '/setup', '/invite'];

function isPublic(pathname) {
	return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function handle({ event, resolve }) {
	if (Math.random() < 0.01) {
		deleteExpiredSessions();
	}

	const sessionId = event.cookies.get('session_id');
	if (sessionId) {
		const result = await getSession(sessionId);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
			const member = await getUserFamilyMember(result.user.id);
			event.locals.currentMember = member ?? null;
		} else {
			event.cookies.delete('session_id', { path: '/' });
			event.locals.user = null;
			event.locals.session = null;
			event.locals.currentMember = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
		event.locals.currentMember = null;
	}

	if (event.url.pathname === '/setup') {
		if (await hasAnyUsers()) {
			throw redirect(302, '/login');
		}
	} else if (!isPublic(event.url.pathname) && !event.locals.user) {
		if (!(await hasAnyUsers())) {
			throw redirect(302, '/setup');
		}
		throw redirect(302, '/login');
	} else if (event.url.pathname === '/login' && event.locals.user) {
		throw redirect(302, '/');
	}

	return resolve(event);
}
