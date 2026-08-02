<script>
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import { refreshOnSubmit } from '$lib/form-helpers.js';
	import { PRIORITIES } from '$lib/list-items.js';

	/**
	 * Edit everything about one list item: text, due date, priority, assignee,
	 * notes, steps, photo, and which list it lives on.
	 *
	 * Mounted behind an `{#if}` so each open starts from the item's saved state.
	 */
	let { item, lists = [], family = [], onClose } = $props();

	let text = $state(item.item ?? '');
	let dueDate = $state(item.due_date ?? '');
	let priority = $state(item.priority ?? 'none');
	// Select values are kept as strings so the plain form submit serialises them
	// exactly as the server's numeric parsing expects.
	let assignedTo = $state(item.assigned_to ? String(item.assigned_to) : '');
	let listId = $state(String(item.list_id));
	let notes = $state(item.notes ?? '');
	let steps = $state((item.steps ?? []).map((s) => ({ step: s.step, done: !!s.completed_at })));

	let fileInput = $state(null);
	let dragOver = $state(false);
	let removeImage = $state(false);
	let previewUrl = $state(item.image ? `/store/images/lists/${item.image}` : null);

	function addStep() {
		steps = [...steps, { step: '', done: false }];
	}

	function removeStep(index) {
		steps = steps.filter((_, i) => i !== index);
	}

	function pickFile(file) {
		if (!file || !file.type.startsWith('image/')) {
			return;
		}
		previewUrl = URL.createObjectURL(file);
		removeImage = false;
	}

	function handleDrop(e) {
		dragOver = false;
		const file = e.dataTransfer.files?.[0];
		if (!file || !file.type.startsWith('image/')) {
			return;
		}
		// Feed the dropped file back into the file input so it rides along with
		// the normal multipart submit.
		const dt = new DataTransfer();
		dt.items.add(file);
		fileInput.files = dt.files;
		pickFile(file);
	}

	function clearImage() {
		previewUrl = null;
		removeImage = true;
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<Modal open title="Edit item" width={560} onClose={() => onClose?.()}>
	{#snippet actions()}
		<form method="POST" action="?/deleteItem" use:enhance={refreshOnSubmit(() => onClose?.())}>
			<input type="hidden" name="item_id" value={item.id} />
			<button
				type="submit"
				class="btn-ghost btn-danger"
				onclick={(e) => {
					if (!confirm('Delete this item?')) {
						e.preventDefault();
					}
				}}
			>
				🗑 Delete
			</button>
		</form>
		<button type="button" class="btn-ghost" onclick={() => onClose?.()} aria-label="Close">✕</button>
	{/snippet}

	<form method="POST" action="?/updateItem" enctype="multipart/form-data" use:enhance={refreshOnSubmit(() => onClose?.())} class="item-form">
		<input type="hidden" name="item_id" value={item.id} />
		<input type="hidden" name="remove_image" value={removeImage ? '1' : '0'} />

		<div class="field">
			<label class="field-label" for="item-text">Item</label>
			<input class="input" id="item-text" name="item" type="text" bind:value={text} required />
		</div>

		<div class="field-row">
			<div class="field">
				<label class="field-label" for="item-due">Due date</label>
				<div class="due-row">
					<input class="input" id="item-due" name="due_date" type="date" bind:value={dueDate} />
					{#if dueDate}
						<button type="button" class="btn-ghost" title="Clear due date" onclick={() => (dueDate = '')}>✕</button>
					{/if}
				</div>
			</div>

			<div class="field">
				<label class="field-label" for="item-priority">Priority</label>
				<select class="input" id="item-priority" name="priority" bind:value={priority}>
					{#each PRIORITIES as p (p.key)}
						<option value={p.key}>{p.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="field-row">
			<div class="field">
				<label class="field-label" for="item-assignee">Assigned to</label>
				<select class="input" id="item-assignee" name="assigned_to" bind:value={assignedTo}>
					<option value="">Unassigned</option>
					{#each family as member (member.id)}
						<option value={String(member.id)}>{member.name}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label class="field-label" for="item-list">List</label>
				<select class="input" id="item-list" name="list_id" bind:value={listId}>
					{#each lists as l (l.id)}
						<option value={String(l.id)}>{l.title}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="field">
			<div class="steps-head">
				<span class="field-label">Steps</span>
				<button type="button" class="btn-ghost" onclick={addStep}>+ Add step</button>
			</div>
			{#each steps as step, i (i)}
				<div class="step-row">
					<input type="checkbox" bind:checked={step.done} aria-label="Step {i + 1} done" />
					<input type="hidden" name="step_done" value={step.done ? '1' : '0'} />
					<input class="input input-sm" type="text" name="step_text" placeholder="Step…" bind:value={step.step} />
					<button type="button" class="btn-ghost" title="Remove step" onclick={() => removeStep(i)}>✕</button>
				</div>
			{/each}
		</div>

		<div class="field">
			<label class="field-label" for="item-notes">Notes</label>
			<textarea class="textarea" id="item-notes" name="notes" rows="3" bind:value={notes}></textarea>
		</div>

		<div class="field">
			<span class="field-label">Photo</span>
			<div
				class="dropzone"
				class:drag-over={dragOver}
				role="button"
				tabindex="0"
				aria-label="Upload a photo"
				ondragover={(e) => {
					e.preventDefault();
					dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={(e) => {
					e.preventDefault();
					handleDrop(e);
				}}
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
			>
				{#if previewUrl}
					<img src={previewUrl} alt="Item attachment preview" class="preview" />
				{:else}
					<span class="dropzone-hint">Drop an image here or click to choose one</span>
				{/if}
			</div>
			<input bind:this={fileInput} type="file" name="image" accept="image/*" class="file-input" onchange={(e) => pickFile(e.target.files?.[0])} />
			{#if previewUrl}
				<button type="button" class="btn-ghost remove-photo" onclick={clearImage}>Remove photo</button>
			{/if}
		</div>

		<div class="form-footer">
			<button type="button" class="btn btn-cancel" onclick={() => onClose?.()}>Cancel</button>
			<button type="submit" class="btn btn-save" disabled={!text.trim()}>Save</button>
		</div>
	</form>
</Modal>

<style>
	.item-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.due-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.steps-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.step-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.step-row input[type='checkbox'] {
		flex-shrink: 0;
		width: 15px;
		height: 15px;
		cursor: pointer;
	}

	.dropzone {
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
		padding: 0.75rem;
		min-height: 84px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		background: #f9fafb;
	}

	.dropzone.drag-over {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.dropzone-hint {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.preview {
		max-height: 180px;
		max-width: 100%;
		border-radius: 6px;
		display: block;
	}

	.file-input {
		display: none;
	}

	.remove-photo {
		align-self: flex-start;
		font-size: 0.78rem;
	}
</style>
