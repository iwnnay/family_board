<script>
	import { enhance } from '$app/forms';
	import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';
	import SwatchPicker from '$lib/components/SwatchPicker.svelte';

	let { data, form } = $props();

	let newColor = $state('blue');
</script>

<h1 class="page-title-lg">Manage Family</h1>

<div class="form-card">
	<h2 class="section-heading">Add Family Member</h2>

	<FeedbackMessage error={form?.error ?? ''} />

	<form method="POST" action="?/add" use:enhance>
		<div class="inline-field">
			<input class="input" name="name" type="text" placeholder="Name" required />
			<button type="submit" class="btn btn-blue">Add</button>
		</div>

		<div class="color-row">
			<span class="field-label">Color</span>
			<SwatchPicker bind:selected={newColor} />
		</div>
	</form>
</div>

<div class="family-list">
	<h2 class="section-heading">Family Members ({data.family.length})</h2>

	{#if data.family.length === 0}
		<p class="empty">No family members yet. Add someone above!</p>
	{:else}
		{#each data.family as member (member.id)}
			<div class="member-card">
				<div class="member-header">
					<span class="member-name">{member.name}</span>
					<form
						method="POST"
						action="?/delete"
						use:enhance
						onsubmit={(e) => {
							if (!confirm(`Remove "${member.name}"?`)) {e.preventDefault();}
						}}
					>
						<input type="hidden" name="id" value={member.id} />
						<button type="submit" class="btn-delete">Remove</button>
					</form>
				</div>

				<form method="POST" action="?/setColor" use:enhance>
					<input type="hidden" name="id" value={member.id} />
					<SwatchPicker mode="button" selected={member.color} />
				</form>
			</div>
		{/each}
	{/if}
</div>

<style>
	.form-card,
	.family-list {
		max-width: 480px;
	}

	.inline-field {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.empty {
		color: #94a3b8;
		font-style: italic;
	}

	.member-card {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 0.9rem 1rem;
		margin-bottom: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.member-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.member-name {
		font-weight: 600;
		font-size: 1rem;
		color: #1e293b;
	}
</style>
