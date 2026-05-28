import { fail, redirect } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { getUserByUsername, incrementFailedLogins, resetFailedLogins, createSession, hasAnyUsers } from '$lib/server/db';
import { sessionCookieOptions } from '$lib/server/cookie-config.js';

export async function load() {
	if (!(await hasAnyUsers())) {
		throw redirect(302, '/setup');
	}
	return {};
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required', username });
		}

		const user = await getUserByUsername(username);
		if (!user) {
			return fail(400, { error: 'Invalid credentials', username });
		}

		if (user.locked_until && new Date(user.locked_until) > new Date()) {
			return fail(429, { error: 'Account locked due to too many attempts. Try again later.', username });
		}

		let valid;
		try {
			valid = await verify(user.password_hash, password);
		} catch {
			valid = false;
		}

		if (!valid) {
			await incrementFailedLogins(user.id);
			return fail(400, { error: 'Invalid credentials', username });
		}

		await resetFailedLogins(user.id);
		const sessionId = await createSession(user.id);
		cookies.set('session_id', sessionId, sessionCookieOptions());
		throw redirect(302, '/');
	}
};
