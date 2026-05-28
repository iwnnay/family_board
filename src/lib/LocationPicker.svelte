<script>
	import { deserialize } from '$app/forms';

	let { locations = [], value = $bindable(''), name = 'location_id' } = $props();

	let allLocations = $state([...locations]);
	let search = $state('');
	let open = $state(false);
	let creating = $state(false);
	let newName = $state('');
	let newAddress = $state('');
	let saving = $state(false);

	let selected = $derived(allLocations.find((l) => String(l.id) === String(value)) ?? null);

	let filtered = $derived(search.trim() ? allLocations.filter((l) => l.name.toLowerCase().includes(search.trim().toLowerCase())) : allLocations);

	function openDropdown() {
		search = selected ? selected.name : '';
		open = true;
		creating = false;
	}

	function selectLocation(loc) {
		value = String(loc.id);
		search = loc.name;
		open = false;
		creating = false;
	}

	function clearSelection() {
		value = '';
		search = '';
		open = false;
		creating = false;
	}

	function startCreating() {
		newName = search;
		newAddress = '';
		creating = true;
	}

	async function saveNewLocation() {
		if (!newName.trim()) {return;}
		saving = true;
		const fd = new FormData();
		fd.set('name', newName.trim());
		fd.set('address', newAddress.trim());
		const res = await fetch('?/saveLocation', {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': '1' }
		});
		const result = deserialize(await res.text());
		saving = false;
		if (result?.data?.location) {
			const loc = result.data.location;
			allLocations = [...allLocations, loc].sort((a, b) => a.name.localeCompare(b.name));
			selectLocation(loc);
		}
	}

	function onInputKeydown(e) {
		if (e.key === 'Escape') {
			open = false;
			creating = false;
		}
	}

	function onBackdropClick() {
		open = false;
		creating = false;
		if (!selected) {
			search = '';
		} else {
			search = selected.name;
		}
	}
</script>

<input type="hidden" {name} {value} />

<div class="picker">
	<!-- trigger input -->
	<div class="input-wrap">
		<input
			class="input"
			type="text"
			placeholder="Search locations…"
			bind:value={search}
			onfocus={openDropdown}
			oninput={() => {
				open = true;
				creating = false;
			}}
			onkeydown={onInputKeydown}
			autocomplete="off"
		/>
		{#if value}
			<button type="button" class="clear-btn" onclick={clearSelection} tabindex="-1">✕</button>
		{/if}
	</div>

	{#if open}
		<!-- backdrop to close on outside click -->
		<div class="backdrop" role="button" tabindex="-1" onclick={onBackdropClick} onkeydown={() => {}}></div>

		<div class="dropdown">
			{#if !creating}
				{#if filtered.length === 0}
					<p class="no-results">No locations found.</p>
				{:else}
					<ul class="option-list">
						{#each filtered as loc (loc.id)}
							<li>
								<button type="button" class="option" class:selected={String(loc.id) === String(value)} onclick={() => selectLocation(loc)}>
									<span class="option-name">{loc.name}</span>
									{#if loc.address}
										<span class="option-addr">{loc.address}</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<button type="button" class="add-new-btn" onclick={startCreating}>+ Add new location</button>
			{:else}
				<div class="create-form">
					<input class="input input-sm" type="text" placeholder="Location name" bind:value={newName} />
					<input class="input input-sm" type="text" placeholder="Address (optional)" bind:value={newAddress} />
					<div class="create-actions">
						<button type="button" class="btn-ghost" onclick={() => (creating = false)}>Cancel</button>
						<button type="button" class="btn-save" onclick={saveNewLocation} disabled={saving || !newName.trim()}>
							{saving ? 'Saving…' : 'Save'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.picker {
		position: relative;
	}

	.input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 2rem 0.45rem 0.65rem;
		font-size: 0.9rem;
		width: 100%;
		font-family: inherit;
	}

	.input:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.input-sm {
		padding: 0.35rem 0.6rem;
		font-size: 0.85rem;
	}

	.clear-btn {
		position: absolute;
		right: 0.4rem;
		background: none;
		border: none;
		cursor: pointer;
		color: #9ca3af;
		font-size: 0.75rem;
		padding: 0.2rem;
		line-height: 1;
	}

	.clear-btn:hover {
		color: #374151;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		z-index: 11;
		overflow: hidden;
		max-height: 260px;
		display: flex;
		flex-direction: column;
	}

	.option-list {
		list-style: none;
		overflow-y: auto;
		flex: 1;
	}

	.option {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
		gap: 0.1rem;
	}

	.option:hover,
	.option.selected {
		background: #f3f4f6;
	}

	.option-name {
		font-size: 0.88rem;
		font-weight: 500;
		color: #1f2937;
	}

	.option-addr {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.no-results {
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
		color: #9ca3af;
	}

	.add-new-btn {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		border-top: 1px solid #f3f4f6;
		cursor: pointer;
		text-align: left;
		font-size: 0.82rem;
		color: #2563eb;
		font-weight: 500;
	}

	.add-new-btn:hover {
		background: #eff6ff;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.65rem 0.75rem;
	}

	.create-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.4rem;
	}

	.btn-ghost {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		color: #6b7280;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.btn-ghost:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.btn-save {
		background: #374151;
		color: #fff;
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		padding: 0.25rem 0.65rem;
		cursor: pointer;
	}

	.btn-save:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn-save:not(:disabled):hover {
		background: #1f2937;
	}
</style>
