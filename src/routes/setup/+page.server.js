import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { hasAnyUsers, createUser, createSession, getFamilyMembers, linkFamilyMemberToUser, addFamilyMember } from '$lib/server/db';
import { sessionCookieOptions } from '$lib/server/cookie-config.js';

export async function load() {
	if (await hasAnyUsers()) {
		throw redirect(302, '/login');
	}
	return {};
}

export const actions = {
	default: async ({ request, cookies }) => {
		if (await hasAnyUsers()) {
			throw redirect(302, '/login');
		}

		const data = await request.formData();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirm_password')?.toString();
		const displayName = data.get('display_name')?.toString().trim();
		const color = data.get('color')?.toString().trim() || 'blue';

		if (!username) {return fail(400, { error: 'Username is required', displayName, color });}
		if (!password || password.length < 8) {return fail(400, { error: 'Password must be at least 8 characters', username, displayName, color });}
		if (password !== confirmPassword) {return fail(400, { error: 'Passwords do not match', username, displayName, color });}
		if (!displayName) {return fail(400, { error: 'Display name is required', username, color });}

		const passwordHash = await hash(password);
		const user = await createUser({ username, passwordHash, isAdmin: true });

		// Link all existing family members to this first user
		const existingMembers = await getFamilyMembers();
		for (const member of existingMembers) {
			await linkFamilyMemberToUser(member.id, user.id);
		}

		// Create this user's own family member profile
		await addFamilyMember(displayName, color);
		const updatedMembers = await getFamilyMembers();
		const newMember = updatedMembers.find((m) => m.name === displayName && !m.user_id);
		if (newMember) {
			await linkFamilyMemberToUser(newMember.id, user.id);
		}

		const sessionId = await createSession(user.id);
		cookies.set('session_id', sessionId, sessionCookieOptions());
		throw redirect(302, '/');
	}
};
