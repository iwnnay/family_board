import { getFamilyMembers } from '$lib/server/db';

export async function load({ locals }) {
	const family = await getFamilyMembers();
	return {
		family,
		currentMember: locals.currentMember,
		user: locals.user
	};
}
