import { applyAction, deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

/**
 * `use:enhance` handler for forms whose only job is to refresh the page data.
 * `update()` re-runs the load functions itself, so no extra invalidation.
 *
 *   <form method="POST" action="?/check" use:enhance={refreshOnSubmit()}>
 */
export function refreshOnSubmit(onDone) {
	return () =>
		async ({ update }) => {
			await update();
			onDone?.();
		};
}

/**
 * Invoke a SvelteKit form action via fetch with the headers and lifecycle
 * SvelteKit expects (`x-sveltekit-action`, response deserialization,
 * invalidation, applyAction).
 */
export async function submitAction(action, formData) {
	const response = await fetch(action, {
		method: 'POST',
		body: formData,
		headers: { 'x-sveltekit-action': '1' }
	});
	const result = deserialize(await response.text());
	if (result.type === 'success' || result.type === 'redirect') {
		await invalidateAll();
	}
	applyAction(result);
	return result;
}
