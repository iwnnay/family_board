/**
 * Health check registry. Modules can register named checks; the /health
 * endpoint runs them all and reports status.
 */

const checks = new Map();

export function registerHealthCheck(name, check) {
	checks.set(name, check);
}

export function unregisterHealthCheck(name) {
	checks.delete(name);
}

export async function runHealthChecks() {
	if (checks.size === 0) {
		return { status: 'ok' };
	}

	const entries = await Promise.all(
		Array.from(checks, async ([name, check]) => {
			try {
				return [name, await check(), false];
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return [name, { error: message }, true];
			}
		})
	);

	const results = {};
	let failed = false;
	for (const [name, value, isError] of entries) {
		results[name] = value;
		if (isError) failed = true;
	}

	return { status: failed ? 'error' : 'ok', checks: results };
}
