import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { getAllUsers, getActiveInvites, createInviteCode, updatePassword, deleteUserSessions, deleteUser } from '$lib/server/db';

export async function load({ locals }) {
	if (!locals.user?.is_admin) {
		throw redirect(302, '/');
	}
	const [userList, invites] = await Promise.all([getAllUsers(), getActiveInvites()]);
	return { users: userList, invites };
}

export const actions = {
	createInvite: async ({ locals }) => {
		if (!locals.user?.is_admin) return fail(403, { error: 'Admin only' });
		const invite = await createInviteCode(locals.user.id);
		return { newInviteCode: invite.code };
	},

	resetPassword: async ({ request, locals }) => {
		if (!locals.user?.is_admin) return fail(403, { error: 'Admin only' });
		const data = await request.formData();
		const userId = Number(data.get('user_id'));
		const newPassword = data.get('new_password')?.toString();

		if (!newPassword || newPassword.length < 8) {
			return fail(400, {
				error: 'Password must be at least 8 characters',
				resetUserId: userId
			});
		}

		const passwordHash = await hash(newPassword);
		await updatePassword(userId, passwordHash);
		await deleteUserSessions(userId);
		return { resetSuccess: true };
	},

	deleteUser: async ({ request, locals }) => {
		if (!locals.user?.is_admin) return fail(403, { error: 'Admin only' });
		const data = await request.formData();
		const userId = Number(data.get('user_id'));

		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot delete your own account' });
		}

		await deleteUser(userId);
		return { deleteSuccess: true };
	}
};
