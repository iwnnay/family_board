import { getFamilyMembers } from '$lib/server/db';

export async function load({ cookies }) {
	const family = await getFamilyMembers();
	const memberId = cookies.get('member_id');
	const currentMember = family.find((m) => m.id === Number(memberId)) ?? null;

	return { family, currentMember };
}
