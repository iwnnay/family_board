import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/db';

export const actions = {
	default: async ({ cookies, locals }) => {
		if (locals.session) {
			await deleteSession(locals.session.id);
		}
		cookies.delete('session_id', { path: '/' });
		throw redirect(302, '/login');
	}
};
