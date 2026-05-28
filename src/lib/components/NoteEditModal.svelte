<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { colorDotStyle } from '$lib/color-styles.js';
	import ColorPickerModal from './ColorPickerModal.svelte';

	let { note, onClose, onSaved, action = '/notes?/save' } = $props();

	const emptyBody = () => ({ subtitle: '', body: '' });

	let formTitle = $state(note?.title ?? '');
	let formColor = $state(note?.color ?? '');
	let formBodies = $state(note?.bodies?.length ? note.bodies.map((b) => ({ subtitle: b.subtitle ?? '', body: b.body ?? '' })) : [emptyBody()]);
	let colorPickerOpen = $state(false);

	function addBody(prepend = false) {
		formBodies = prepend ? [emptyBody(), ...formBodies] : [...formBodies, emptyBody()];
	}

	function removeBody(i) {
		formBodies = formBodies.filter((_, idx) => idx !== i);
		if (formBodies.length === 0) {formBodies = [emptyBody()];}
	}
</script>

<div class="modal-overlay" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<div class="note-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
		<div class="note-modal-toolbar">
			<span class="note-modal-title">{note?.id ? 'Edit note' : 'New note'}</span>
		</div>
		<form
			method="POST"
			{action}
			use:enhance={() =>
				async ({ update }) => {
					await update();
					await invalidateAll();
					onSaved?.();
				}}
			class="note-edit-form"
		>
			{#if note?.id}
				<input type="hidden" name="id" value={note.id} />
			{/if}

			<div class="note-title-row">
				<input class="note-input" type="text" name="title" placeholder="Title" bind:value={formTitle} />
				<button type="button" class="color-dot" style={colorDotStyle(formColor)} title="Pick color" onclick={() => (colorPickerOpen = true)} aria-label="Pick color"></button>
			</div>
			<input type="hidden" name="color" value={formColor} />

			<button type="button" class="btn-ghost add-body-btn" onclick={() => addBody(true)}> + Add section </button>

			{#each formBodies as b, i (i)}
				<div class="note-body-section">
					<div class="note-body-head">
						<input class="note-input note-input-sm" type="text" name="subtitle" placeholder="Subtitle (optional)" bind:value={b.subtitle} />
						{#if formBodies.length > 1}
							<button type="button" class="btn-ghost" onclick={() => removeBody(i)}>✕</button>
						{/if}
					</div>
					<textarea class="note-textarea" name="body" placeholder="Body" rows="4" bind:value={b.body}></textarea>
				</div>
			{/each}

			<button type="button" class="btn-ghost add-body-btn" onclick={() => addBody()}> + Add section </button>

			<div class="note-edit-footer">
				<button type="button" class="btn btn-cancel" onclick={onClose}>Cancel</button>
				<button type="submit" class="btn btn-save">Save</button>
			</div>
		</form>
	</div>
</div>

<ColorPickerModal bind:open={colorPickerOpen} selected={formColor} onPick={(c) => (formColor = c)} />

<style>
	.note-modal {
		background: #fff;
		border-radius: 12px;
		width: min(620px, 95vw);
		max-height: 85vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
	}

	.note-modal-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.85rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.note-modal-title {
		font-weight: 700;
		font-size: 1rem;
		color: #1f2937;
	}

	.note-edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem 1.25rem;
		overflow-y: auto;
	}

	.note-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.note-input {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
		width: 100%;
	}

	.note-input:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.note-input-sm {
		font-size: 0.82rem;
		padding: 0.3rem 0.5rem;
	}

	.note-textarea {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
		width: 100%;
		resize: vertical;
		font-family: inherit;
	}

	.note-textarea:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.color-dot {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid;
		cursor: pointer;
		padding: 0;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.color-dot:hover {
		transform: scale(1.15);
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
	}

	.note-body-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-left: 3px solid #e5e7eb;
		padding-left: 0.75rem;
		margin-top: 2px;
	}

	.note-body-head {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.add-body-btn {
		align-self: flex-start;
		font-size: 0.82rem;
		color: #6b7280;
	}

	.note-edit-footer {
		display: flex;
		justify-content: space-between;
		padding-top: 0.25rem;
	}
</style>
