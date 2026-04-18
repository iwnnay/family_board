import { getStats } from '$lib/server/db';

export function load() {
	return { stats: getStats() };
}
