import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { getInviteCode, getUserByUsername, createUser, markInviteUsed, createSession, addFamilyMember, getFamilyMembers, linkFamilyMemberToUser } from '$lib/server/db';
import { sessionCookieOptions } from '$lib/server/cookie-config.js';

export async function load({ url }) {
	const code = url.searchParams.get('code') ?? '';
	return { code };
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const code = data.get('code')?.toString().trim();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirm_password')?.toString();
		const displayName = data.get('display_name')?.toString().trim();
		const color = data.get('color')?.toString().trim() || 'blue';

		if (!code) {return fail(400, { error: 'Invite code is required', username, displayName, color });}

		const invite = await getInviteCode(code);
		if (!invite)
			{return fail(400, {
				error: 'Invalid or expired invite code',
				username,
				displayName,
				color,
				code
			});}

		if (!username) {return fail(400, { error: 'Username is required', displayName, color, code });}
		if (!password || password.length < 8)
			{return fail(400, {
				error: 'Password must be at least 8 characters',
				username,
				displayName,
				color,
				code
			});}
		if (password !== confirmPassword)
			{return fail(400, {
				error: 'Passwords do not match',
				username,
				displayName,
				color,
				code
			});}
		if (!displayName) {return fail(400, { error: 'Display name is required', username, color, code });}

		const existing = await getUserByUsername(username);
		if (existing) {return fail(400, { error: 'Username already taken', displayName, color, code });}

		const passwordHash = await hash(password);
		const user = await createUser({ username, passwordHash, isAdmin: false });
		await markInviteUsed(invite.id, user.id);

		await addFamilyMember(displayName, color);
		const members = await getFamilyMembers();
		const newMember = members.find((m) => m.name === displayName && !m.user_id);
		if (newMember) {
			await linkFamilyMemberToUser(newMember.id, user.id);
		}

		const sessionId = await createSession(user.id);
		cookies.set('session_id', sessionId, sessionCookieOptions());
		throw redirect(302, '/');
	}
};
