<script>
	import { enhance } from '$app/forms';
	import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';
	import SwatchPicker from '$lib/components/SwatchPicker.svelte';

	let { data, form } = $props();

	let selectedColor = $state(data.member?.color ?? 'blue');
</script>

<h1 class="page-title-lg">My Settings</h1>

<section class="section-card">
	<h2 class="section-heading">Profile</h2>

	<FeedbackMessage error={form?.profileError ?? ''} success={form?.profileSuccess ? 'Profile updated.' : ''} />

	<form method="POST" action="?/profile" use:enhance class="stack">
		<div class="field">
			<label class="field-label" for="name">Display Name</label>
			<input class="input" id="name" type="text" name="name" value={data.member?.name ?? ''} required />
		</div>

		<div class="field">
			<span class="field-label">Color</span>
			<SwatchPicker bind:selected={selectedColor} />
		</div>

		<button type="submit" class="btn btn-blue self-start">Save</button>
	</form>
</section>

<section class="section-card">
	<h2 class="section-heading">Change Password</h2>

	<FeedbackMessage error={form?.passwordError ?? ''} success={form?.passwordSuccess ? 'Password changed.' : ''} />

	<form method="POST" action="?/password" use:enhance class="stack">
		<div class="field">
			<label class="field-label" for="current_password">Current Password</label>
			<input class="input" id="current_password" type="password" name="current_password" autocomplete="current-password" required />
		</div>

		<div class="field">
			<label class="field-label" for="new_password">New Password</label>
			<input class="input" id="new_password" type="password" name="new_password" autocomplete="new-password" required />
			<span class="field-hint">At least 8 characters</span>
		</div>

		<div class="field">
			<label class="field-label" for="confirm_password">Confirm New Password</label>
			<input class="input" id="confirm_password" type="password" name="confirm_password" autocomplete="new-password" required />
		</div>

		<button type="submit" class="btn btn-blue self-start">Change Password</button>
	</form>
</section>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.self-start {
		align-self: flex-start;
	}

	.section-card {
		max-width: 480px;
	}
</style>
