<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { fmtDate } from '$lib/format.js';
	import { colorDotStyle, noteCardStyle, noteHeaderStyle } from '$lib/color-styles.js';
	import NoteCard from '$lib/components/NoteCard.svelte';
	import ColorPickerModal from '$lib/components/ColorPickerModal.svelte';

	let { data } = $props();

	let modal = $state(null); // null | 'create' | 'read' | 'edit'
	let activeNote = $state(null);
	let editingId = $state(null);

	const emptyBody = () => ({ subtitle: '', body: '' });
	let formTitle = $state('');
	let formColor = $state('');
	let formBodies = $state([emptyBody()]);

	const CREATE_DRAFT_KEY = 'notes_draft';
	let editDraft = $state(null);

	let colorPickerOpen = $state(false);

	function openCreate() {
		const saved = localStorage.getItem(CREATE_DRAFT_KEY);
		if (saved) {
			try {
				const d = JSON.parse(saved);
				formTitle = d.title ?? '';
				formColor = d.color ?? '';
				formBodies = d.bodies?.length ? d.bodies : [emptyBody()];
			} catch {
				resetForm();
			}
		} else {
			resetForm();
		}
		editingId = null;
		modal = 'create';
	}

	function openEdit(note) {
		if (editDraft && editDraft.id === note.id) {
			formTitle = editDraft.title;
			formColor = editDraft.color;
			formBodies = editDraft.bodies;
		} else {
			formTitle = note.title ?? '';
			formColor = note.color ?? '';
			formBodies = note.bodies?.length ? note.bodies.map((b) => ({ subtitle: b.subtitle ?? '', body: b.body ?? '' })) : [emptyBody()];
		}
		editingId = note.id;
		modal = 'edit';
	}

	async function openRead(note) {
		const res = await fetch(`?/loadNote`, {
			method: 'POST',
			body: new URLSearchParams({ id: String(note.id) }),
			headers: { 'x-sveltekit-action': '1' }
		});
		const result = deserialize(await res.text());
		activeNote = result?.data?.note ?? note;
		modal = 'read';
	}

	function closeModal(cancel = false) {
		if (cancel) {
			if (modal === 'create') {localStorage.removeItem(CREATE_DRAFT_KEY);}
			else if (modal === 'edit') {editDraft = null;}
			resetForm();
		} else {
			if (modal === 'create') {
				localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify({ title: formTitle, color: formColor, bodies: formBodies }));
			} else if (modal === 'edit' && editingId) {
				editDraft = { id: editingId, title: formTitle, color: formColor, bodies: formBodies };
			}
		}
		modal = null;
		activeNote = null;
		editingId = null;
	}

	function resetForm() {
		formTitle = '';
		formColor = '';
		formBodies = [emptyBody()];
	}

	function clearForm() {
		localStorage.removeItem(CREATE_DRAFT_KEY);
		editDraft = null;
		resetForm();
	}

	function addBody(prepend = false) {
		formBodies = prepend ? [emptyBody(), ...formBodies] : [...formBodies, emptyBody()];
	}

	function removeBody(i) {
		formBodies = formBodies.filter((_, idx) => idx !== i);
		if (formBodies.length === 0) {formBodies = [emptyBody()];}
	}
</script>

<h1 class="page-title">Notes</h1>

<div class="notes-grid">
	<button class="note-card create-card" onclick={openCreate}>
		<span class="create-label">+ Create a new note</span>
	</button>

	{#each data.notes as note (note.id)}
		<NoteCard {note} onOpen={openRead} />
	{/each}
</div>

<!-- ── create / edit modal ────────────────────────────────────────────────── -->
{#if modal === 'create' || modal === 'edit'}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={() => closeModal()} onkeydown={() => {}}>
		<div class="modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="modal-toolbar">
				<span class="modal-heading">{modal === 'edit' ? 'Edit note' : 'New note'}</span>
				<button class="btn-ghost" onclick={clearForm} title="Clear form">✕ Clear</button>
			</div>

			<form
				method="POST"
				action="?/save"
				use:enhance={() =>
					async ({ update }) => {
						localStorage.removeItem(CREATE_DRAFT_KEY);
						editDraft = null;
						await update();
						await invalidateAll();
						closeModal(true);
					}}
				class="note-form"
			>
				{#if editingId}
					<input type="hidden" name="id" value={editingId} />
				{/if}

				<div class="title-row">
					<input class="input" type="text" name="title" placeholder="Title" bind:value={formTitle} />
					<button type="button" class="color-dot" style={colorDotStyle(formColor)} title="Pick color" onclick={() => (colorPickerOpen = true)} aria-label="Pick color"></button>
				</div>
				<input type="hidden" name="color" value={formColor} />

				<button type="button" class="btn-ghost add-body" onclick={() => addBody(true)}> + Add section </button>

				{#each formBodies as b, i (i)}
					<div class="body-section">
						<div class="body-section-head">
							<input class="input input-sm" type="text" name="subtitle" placeholder="Subtitle (optional)" bind:value={b.subtitle} />
							{#if formBodies.length > 1}
								<button type="button" class="btn-ghost remove-body" onclick={() => removeBody(i)}>✕</button>
							{/if}
						</div>
						<textarea class="textarea" name="body" placeholder="Body" rows="4" bind:value={b.body}></textarea>
					</div>
				{/each}

				<button type="button" class="btn-ghost add-body" onclick={() => addBody()}> + Add section </button>

				<div class="modal-footer">
					<button type="button" class="btn btn-cancel" onclick={() => closeModal(true)}> Cancel </button>
					<button type="submit" class="btn btn-save">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ColorPickerModal bind:open={colorPickerOpen} selected={formColor} onPick={(c) => (formColor = c)} />

<!-- ── read modal ─────────────────────────────────────────────────────────── -->
{#if modal === 'read' && activeNote}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={() => closeModal()} onkeydown={() => {}}>
		<div class="modal modal-read" style={noteCardStyle(activeNote)} role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="modal-toolbar" style={noteHeaderStyle(activeNote)}>
				<span class="read-title">{activeNote.title || 'Untitled'}</span>
				<div class="read-actions">
					<form
						method="POST"
						action="?/pin"
						use:enhance={() =>
							async ({ update }) => {
								await update();
								await invalidateAll();
								activeNote = { ...activeNote, pinned: !activeNote.pinned };
							}}
					>
						<input type="hidden" name="id" value={activeNote.id} />
						<button type="submit" class="btn-ghost">
							{activeNote.pinned ? '📌 Unpin' : '📍 Pin'}
						</button>
					</form>
					<button class="btn-ghost" onclick={() => openEdit(activeNote)}>✏️ Edit</button>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() =>
							async ({ update }) => {
								await update();
								await invalidateAll();
								closeModal();
							}}
					>
						<input type="hidden" name="id" value={activeNote.id} />
						<button
							type="submit"
							class="btn-ghost btn-danger"
							onclick={(e) => {
								if (!confirm('Delete this note?')) {e.preventDefault();}
							}}
						>
							🗑 Delete
						</button>
					</form>
					<button class="btn-ghost" onclick={() => closeModal()}>✕</button>
				</div>
			</div>

			<div class="read-body">
				<p class="read-date">Updated {fmtDate(activeNote.updated_at)}</p>
				{#each activeNote.bodies ?? [] as section (section.id)}
					{#if section.subtitle}
						<h4 class="section-subtitle">{section.subtitle}</h4>
					{/if}
					{#if section.body}
						<p class="section-body">{section.body}</p>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.notes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.note-card.create-card {
		background: #fff;
		border: 1px dashed #e5e7eb;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 110px;
		color: #9ca3af;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.note-card.create-card:hover {
		color: #6b7280;
		background: #f9fafb;
	}

	/* ── modal ── */
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
		width: min(560px, 95vw);
		max-height: 90vh;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
	}

	.modal-read {
		width: min(640px, 95vw);
		overflow-y: hidden;
	}

	.modal-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: -1.25rem -1.25rem 0;
		padding: 0.6rem 0.75rem;
		border-radius: 12px 12px 0 0;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-heading {
		font-weight: 600;
		font-size: 0.95rem;
		color: #374151;
	}

	.read-title {
		font-weight: 700;
		font-size: 1rem;
		color: #1f2937;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.read-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.note-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.body-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-left: 3px solid #e5e7eb;
		padding-left: 0.75rem;
		margin-top: 2px;
	}

	.body-section-head {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.remove-body {
		flex-shrink: 0;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.add-body {
		align-self: flex-start;
		font-size: 0.82rem;
		color: #6b7280;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		padding-top: 0.25rem;
	}

	.read-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.25rem;
		overflow-y: auto;
		flex: 1;
	}

	.read-date {
		font-size: 0.78rem;
		color: #9ca3af;
	}

	.section-subtitle {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin-top: 0.5rem;
	}

	.section-body {
		font-size: 0.92rem;
		color: #4b5563;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	@media (max-width: 640px) {
		.notes-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
