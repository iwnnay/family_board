<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';

	let { data } = $props();

	let editing = $state(null);
	let showForm = $state(false);
	let formName = $state('');
	let formAddress = $state('');
	let search = $state('');

	const LIMIT = 50;

	let visible = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const filtered = q ? data.locations.filter((l) => l.name.toLowerCase().includes(q) || (l.address ?? '').toLowerCase().includes(q)) : data.locations;
		return q ? filtered : filtered.slice(0, LIMIT);
	});

	function openCreate() {
		editing = null;
		formName = '';
		formAddress = '';
		showForm = true;
	}

	function openEdit(loc) {
		editing = loc;
		formName = loc.name;
		formAddress = loc.address ?? '';
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editing = null;
	}
</script>

<div class="page-header">
	<h1 class="page-title">Manage Locations</h1>
	<button class="btn btn-primary" onclick={openCreate}>+ New Location</button>
</div>

<div class="search-bar">
	<input class="input search-input" type="search" placeholder="Search locations…" bind:value={search} autocomplete="off" />
	{#if !search.trim() && data.locations.length > LIMIT}
		<span class="search-hint">Showing {LIMIT} of {data.locations.length} · search to find others</span>
	{/if}
</div>

{#if visible.length === 0}
	<p class="empty">{search.trim() ? 'No locations match your search.' : 'No locations yet.'}</p>
{:else}
	<div class="location-list">
		{#each visible as loc (loc.id)}
			<div class="location-row">
				<div class="location-info">
					<span class="location-name">{loc.name}</span>
					{#if loc.address}
						<span class="location-address">{loc.address}</span>
					{/if}
				</div>
				<div class="location-actions">
					<button class="btn-ghost" onclick={() => openEdit(loc)}>Edit</button>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() =>
							async ({ update }) => {
								await update();
								await invalidateAll();
							}}
					>
						<input type="hidden" name="id" value={loc.id} />
						<button
							type="submit"
							class="btn-ghost btn-danger"
							onclick={(e) => {
								if (!confirm(`Delete "${loc.name}"?`)) {e.preventDefault();}
							}}
						>
							Delete
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{/if}

<Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Location' : 'New Location'} width={420}>
	<form
		method="POST"
		action="?/save"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				await invalidateAll();
				closeForm();
			}}
		class="stack"
	>
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}
		<div class="field">
			<label class="field-label" for="loc-name">Name</label>
			<input id="loc-name" class="input" type="text" name="name" bind:value={formName} required />
		</div>
		<div class="field">
			<label class="field-label" for="loc-address">Address</label>
			<input id="loc-address" class="input" type="text" name="address" placeholder="Optional" bind:value={formAddress} />
		</div>
		<div class="form-footer">
			<button type="button" class="btn btn-cancel" onclick={closeForm}>Cancel</button>
			<button type="submit" class="btn btn-primary">Save</button>
		</div>
	</form>
</Modal>

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.search-input {
		max-width: 320px;
	}

	.search-hint {
		font-size: 0.78rem;
		color: #9ca3af;
	}

	.empty {
		color: #9ca3af;
		text-align: center;
		padding: 3rem;
	}

	.location-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.location-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
	}

	.location-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.location-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: #1f2937;
	}

	.location-address {
		font-size: 0.8rem;
		color: #6b7280;
	}

	.location-actions {
		display: flex;
		gap: 0.25rem;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 0 0.1rem 0.25rem;
	}

	@media (max-width: 640px) {
		.search-input {
			max-width: 100%;
		}
	}
</style>
