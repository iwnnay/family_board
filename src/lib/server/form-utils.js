import { fail, redirect } from '@sveltejs/kit';

/** Throws a redirect to '/' if the current user is not an admin. */
export function requireAdmin(locals) {
	if (!locals.user?.is_admin) {
		throw redirect(302, '/');
	}
}

/** Throws a redirect to '/login' if there is no current user. */
export function requireUser(locals) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
}

/** Extract a form field, trimmed. Returns '' when missing. */
export function parseTrimmed(formData, key) {
	return (formData.get(key) ?? '').toString().trim();
}

/** Extract a form field as a raw string (preserves spaces). */
export function parseString(formData, key) {
	return (formData.get(key) ?? '').toString();
}

/** Extract a form field as a number. Returns 0 when missing/invalid. */
export function parseNumber(formData, key) {
	return Number(formData.get(key) ?? 0);
}

/**
 * Validate a password meets minimum requirements.
 * Returns an error string or null if valid.
 */
export function validatePassword(password, confirmPassword) {
	if (!password || password.length < 8) {
		return 'Password must be at least 8 characters';
	}
	if (confirmPassword !== undefined && password !== confirmPassword) {
		return 'Passwords do not match';
	}
	return null;
}

/** Shortcut for `fail(400, { error })`. */
export function badRequest(error, extra = {}) {
	return fail(400, { error, ...extra });
}
