<script>
	import { enhance } from '$app/forms';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';
	import SwatchPicker from '$lib/components/SwatchPicker.svelte';

	let { form } = $props();

	let selectedColor = $state(form?.color ?? 'blue');
</script>

<AuthCard title="Welcome to Family Board" subtitle="Create your admin account to get started.">
	<FeedbackMessage error={form?.error ?? ''} />

	<form method="POST" use:enhance>
		<label class="field">
			<span class="field-label">Username</span>
			<input type="text" name="username" autocomplete="username" value={form?.username ?? ''} required />
		</label>

		<label class="field">
			<span class="field-label">Password</span>
			<input type="password" name="password" autocomplete="new-password" required />
			<span class="field-hint">At least 8 characters</span>
		</label>

		<label class="field">
			<span class="field-label">Confirm Password</span>
			<input type="password" name="confirm_password" autocomplete="new-password" required />
		</label>

		<label class="field">
			<span class="field-label">Display Name</span>
			<input type="text" name="display_name" placeholder="Your name shown in the app" value={form?.displayName ?? ''} required />
		</label>

		<div class="field">
			<span class="field-label">Color</span>
			<SwatchPicker bind:selected={selectedColor} />
		</div>

		<button type="submit" class="btn-blue">Create Account</button>
	</form>
</AuthCard>
