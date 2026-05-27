<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let editing = $state(null); // { id, name, address } | null
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
	<h1>Manage Locations</h1>
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
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								await invalidateAll();
							};
						}}
					>
						<input type="hidden" name="id" value={loc.id} />
						<button
							type="submit"
							class="btn-ghost btn-danger"
							onclick={(e) => {
								if (!confirm(`Delete "${loc.name}"?`)) {
									e.preventDefault();
								}
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

{#if showForm}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={closeForm} onkeydown={() => {}}>
		<div class="modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<h2>{editing ? 'Edit Location' : 'New Location'}</h2>
			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						await invalidateAll();
						closeForm();
					};
				}}
			>
				{#if editing}
					<input type="hidden" name="id" value={editing.id} />
				{/if}
				<div class="field">
					<label for="loc-name">Name</label>
					<input id="loc-name" class="input" type="text" name="name" bind:value={formName} required />
				</div>
				<div class="field">
					<label for="loc-address">Address</label>
					<input id="loc-address" class="input" type="text" name="address" placeholder="Optional" bind:value={formAddress} />
				</div>
				<div class="form-footer">
					<button type="button" class="btn btn-cancel" onclick={closeForm}>Cancel</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.search-input {
		max-width: 320px;
		font-family: inherit;
		width: 100%;
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

	/* modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: #fff;
		border-radius: 12px;
		padding: 1.5rem;
		width: min(420px, 95vw);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.modal h2 {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1f2937;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #374151;
	}

	.input {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
	}

	.input:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.form-footer {
		display: flex;
		justify-content: space-between;
		padding-top: 0.25rem;
	}

	.btn {
		padding: 0.45rem 1.1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn-primary {
		background: #374151;
		color: #fff;
	}

	.btn-primary:hover {
		background: #1f2937;
	}

	.btn-cancel {
		background: #f3f4f6;
		color: #374151;
		border-color: #d1d5db;
	}

	.btn-cancel:hover {
		background: #e5e7eb;
	}

	.btn-ghost {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.82rem;
		color: #6b7280;
		padding: 0.3rem 0.6rem;
		border-radius: 4px;
	}

	.btn-ghost:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #374151;
	}

	.btn-danger:hover {
		color: #dc2626;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		h1 {
			font-size: 1.25rem;
		}

		.search-bar {
			flex-wrap: wrap;
		}

		.search-input {
			max-width: 100%;
		}
	}
</style>
