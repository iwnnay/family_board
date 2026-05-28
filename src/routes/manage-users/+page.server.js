import { fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { getAllUsers, getActiveInvites, createInviteCode, updatePassword, deleteUserSessions, deleteUser } from '$lib/server/db';
import { requireAdmin, parseNumber, parseString, validatePassword } from '$lib/server/form-utils.js';

export async function load({ locals }) {
	requireAdmin(locals);
	const [userList, invites] = await Promise.all([getAllUsers(), getActiveInvites()]);
	return { users: userList, invites };
}

export const actions = {
	createInvite: async ({ locals }) => {
		requireAdmin(locals);
		const invite = await createInviteCode(locals.user.id);
		return { newInviteCode: invite.code };
	},

	resetPassword: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const userId = parseNumber(data, 'user_id');
		const newPassword = parseString(data, 'new_password');

		const err = validatePassword(newPassword);
		if (err) {return fail(400, { error: err, resetUserId: userId });}

		await updatePassword(userId, await hash(newPassword));
		await deleteUserSessions(userId);
		return { resetSuccess: true };
	},

	deleteUser: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const userId = parseNumber(data, 'user_id');

		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot delete your own account' });
		}

		await deleteUser(userId);
		return { deleteSuccess: true };
	}
};
