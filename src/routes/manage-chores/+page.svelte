<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

	let editing = $state(null);
	let previewUrl = $state(null);
	let removeImage = $state(false);
	let dragOver = $state(false);

	function startEdit(chore) {
		editing = { ...chore };
		previewUrl = chore.image ? `/store/images/chores/${chore.image}` : null;
		removeImage = false;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function cancelEdit() {
		editing = null;
		previewUrl = null;
		removeImage = false;
	}

	function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		previewUrl = URL.createObjectURL(file);
		removeImage = false;
	}

	function handleDrop(e) {
		dragOver = false;
		const file = e.dataTransfer.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		// Reflect the dropped file onto the hidden input
		const dt = new DataTransfer();
		dt.items.add(file);
		fileInput.files = dt.files;
		previewUrl = URL.createObjectURL(file);
		removeImage = false;
	}

	function clearImage() {
		previewUrl = null;
		removeImage = true;
		if (fileInput) fileInput.value = '';
	}

	let fileInput = $state(null);
	let formValues = $derived(
		editing ?? { id: '', name: '', frequency: 'none', suggested_day: '', image: null }
	);
</script>

<h1>Manage Chores</h1>

<div class="form-card">
	<h2>{editing ? 'Edit Chore' : 'Add Chore'}</h2>

	{#if form?.error}
		<div class="error">{form.error}</div>
	{/if}

	<form
		method="POST"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				editing = null;
				previewUrl = null;
				removeImage = false;
			};
		}}
	>
		<input type="hidden" name="id" value={formValues.id} />
		<input type="hidden" name="remove_image" value={removeImage ? '1' : '0'} />

		<div class="field">
			<label for="name">Name</label>
			<input id="name" name="name" type="text" value={formValues.name} required placeholder="e.g. Vacuum living room" />
		</div>

		<div class="field">
			<label for="frequency">Frequency</label>
			<select id="frequency" name="frequency">
				{#each FREQUENCIES as freq}
					<option value={freq} selected={formValues.frequency === freq}>
						{freq.charAt(0).toUpperCase() + freq.slice(1)}
					</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="suggested_day">Suggested Day <span class="optional">(optional)</span></label>
			<input
				id="suggested_day"
				name="suggested_day"
				type="text"
				value={formValues.suggested_day ?? ''}
				placeholder="e.g. Monday, weekends..."
			/>
		</div>

		<div class="field">
			<label>Image <span class="optional">(optional)</span></label>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="dropzone"
				class:drag-over={dragOver}
				ondragover={(e) => { e.preventDefault(); dragOver = true; }}
				ondragleave={() => (dragOver = false)}
				ondrop={(e) => { e.preventDefault(); handleDrop(e); }}
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
				role="button"
				tabindex="0"
				aria-label="Upload chore image"
			>
				{#if previewUrl}
					<img src={previewUrl} alt="Chore preview" class="preview" />
					<button
						type="button"
						class="clear-btn"
						onclick={(e) => { e.stopPropagation(); clearImage(); }}
					>✕ Remove</button>
				{:else}
					<div class="dropzone-prompt">
						<span class="drop-icon">🖼️</span>
						<span>Drop an image here or <u>browse</u></span>
					</div>
				{/if}
			</div>
			<input
				bind:this={fileInput}
				type="file"
				name="image"
				accept="image/*"
				class="hidden-input"
				onchange={handleFileChange}
			/>
		</div>

		<div class="actions">
			<button type="submit" class="btn-primary">
				{editing ? 'Update Chore' : 'Add Chore'}
			</button>
			{#if editing}
				<button type="button" class="btn-secondary" onclick={cancelEdit}>Cancel</button>
			{/if}
		</div>
	</form>
</div>

<div class="chores-list">
	<h2>All Chores ({data.chores.length})</h2>

	{#if data.chores.length === 0}
		<p class="empty">No chores yet. Add one above!</p>
	{:else}
		{#each data.chores as chore (chore.id)}
			<div class="chore-row">
				<div class="chore-info">
					{#if chore.image}
						<img
							src="/store/images/chores/{chore.image}"
							alt={chore.name}
							class="chore-thumb"
						/>
					{/if}
					<span class="chore-name">{chore.name}</span>
					<span class="chore-freq freq-{chore.frequency}">{chore.frequency}</span>
					{#if chore.suggested_day}
						<span class="chore-day">{chore.suggested_day}</span>
					{/if}
				</div>
				<div class="chore-actions">
					<button class="btn-edit" onclick={() => startEdit(chore)}>Edit</button>
					<form
						method="POST"
						action="?/delete"
						use:enhance
						onsubmit={(e) => {
							if (!confirm(`Delete "${chore.name}"?`)) e.preventDefault();
						}}
					>
						<input type="hidden" name="id" value={chore.id} />
						<button type="submit" class="btn-delete">Delete</button>
					</form>
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 1rem;
	}

	.form-card {
		background: #fff;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		margin-bottom: 2rem;
		max-width: 480px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 1rem;
	}

	label {
		font-size: 0.85rem;
		font-weight: 500;
		color: #374151;
	}

	.optional {
		color: #94a3b8;
		font-weight: 400;
	}

	input[type='text'],
	select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		color: #1e293b;
		background: #fff;
	}

	input[type='text']:focus,
	select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.hidden-input {
		display: none;
	}

	/* Dropzone */
	.dropzone {
		border: 2px dashed #cbd5e1;
		border-radius: 10px;
		min-height: 120px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		position: relative;
		overflow: hidden;
		gap: 0.5rem;
	}

	.dropzone:hover,
	.dropzone.drag-over {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.dropzone-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		color: #94a3b8;
		font-size: 0.9rem;
		pointer-events: none;
	}

	.drop-icon {
		font-size: 2rem;
	}

	.preview {
		width: 100%;
		height: 160px;
		object-fit: cover;
		border-radius: 8px;
	}

	.clear-btn {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		padding: 0.2rem 0.5rem;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.clear-btn:hover {
		background: rgba(0, 0, 0, 0.75);
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.btn-primary {
		padding: 0.5rem 1.25rem;
		background: #2563eb;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.error {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	/* List */
	.chores-list {
		max-width: 600px;
	}

	.chore-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 1rem;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		gap: 0.75rem;
	}

	.chore-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		flex: 1;
		min-width: 0;
	}

	.chore-thumb {
		width: 36px;
		height: 36px;
		object-fit: cover;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.chore-name {
		font-weight: 500;
		color: #1e293b;
	}

	.chore-freq {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
	}

	.freq-none { background: #dbeafe; color: #1d4ed8; }
	.freq-daily { background: #dcfce7; color: #15803d; }
	.freq-weekly { background: #ffedd5; color: #c2410c; }
	.freq-monthly { background: #f3e8ff; color: #7e22ce; }
	.freq-yearly { background: #fee2e2; color: #b91c1c; }

	.chore-day {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.chore-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn-edit {
		padding: 0.3rem 0.75rem;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: pointer;
		color: #475569;
	}

	.btn-edit:hover { background: #e2e8f0; }

	.btn-delete {
		padding: 0.3rem 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: pointer;
		color: #dc2626;
	}

	.btn-delete:hover { background: #fee2e2; }

	.empty {
		color: #94a3b8;
		font-style: italic;
	}
</style>
