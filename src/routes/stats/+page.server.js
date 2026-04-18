import { getStats } from '$lib/server/db';

export async function load() {
	return { stats: await getStats() };
}
