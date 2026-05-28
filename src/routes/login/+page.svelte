<script>
	import { enhance } from '$app/forms';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';

	let { form } = $props();
</script>

<AuthCard title="Family Board" subtitle="Sign in to continue">
	<FeedbackMessage error={form?.error ?? ''} />

	<form method="POST" use:enhance>
		<label class="field">
			<span class="field-label">Username</span>
			<input type="text" name="username" autocomplete="username" value={form?.username ?? ''} required />
		</label>

		<label class="field">
			<span class="field-label">Password</span>
			<input type="password" name="password" autocomplete="current-password" required />
		</label>

		<button type="submit" class="btn-blue">Sign In</button>
	</form>
</AuthCard>
