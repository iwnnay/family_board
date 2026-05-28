import { fail } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { getUserFamilyMember, updateFamilyMember, updatePassword, getUserById } from '$lib/server/db';

export async function load({ locals }) {
	const member = await getUserFamilyMember(locals.user.id);
	return { member };
}

export const actions = {
	profile: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const color = data.get('color')?.toString().trim();

		if (!name) return fail(400, { profileError: 'Display name is required' });

		const member = await getUserFamilyMember(locals.user.id);
		if (!member) return fail(400, { profileError: 'No profile found' });

		await updateFamilyMember(member.id, { name, color });
		return { profileSuccess: true };
	},

	password: async ({ request, locals }) => {
		const data = await request.formData();
		const currentPassword = data.get('current_password')?.toString();
		const newPassword = data.get('new_password')?.toString();
		const confirmPassword = data.get('confirm_password')?.toString();

		if (!currentPassword) return fail(400, { passwordError: 'Current password is required' });
		if (!newPassword || newPassword.length < 8) return fail(400, { passwordError: 'New password must be at least 8 characters' });
		if (newPassword !== confirmPassword) return fail(400, { passwordError: 'Passwords do not match' });

		const user = await getUserById(locals.user.id);
		let valid;
		try {
			valid = await verify(user.password_hash, currentPassword);
		} catch {
			valid = false;
		}
		if (!valid) return fail(400, { passwordError: 'Current password is incorrect' });

		await updatePassword(locals.user.id, await hash(newPassword));
		return { passwordSuccess: true };
	}
};
