<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { COLORS, getHue } from '$lib/colors.js';

	let { data } = $props();

	// ── modal state ───────────────────────────────────────────────────────────
	let modal = $state(null); // null | 'create' | 'read' | 'edit'
	let activeNote = $state(null); // full note with bodies (for read/edit)
	let editingId = $state(null); // id when editing existing note

	// ── form state ────────────────────────────────────────────────────────────
	const emptyBody = () => ({ subtitle: '', body: '' });
	let formTitle = $state('');
	let formColor = $state('');
	let formBodies = $state([emptyBody()]);

	const CREATE_DRAFT_KEY = 'notes_draft';
	// In-memory draft for edit mode — survives accidental backdrop closes within the session
	let editDraft = $state(null); // { id, title, color, bodies } | null

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
			// Explicit cancel — discard all drafts for this context
			if (modal === 'create') {
				localStorage.removeItem(CREATE_DRAFT_KEY);
			} else if (modal === 'edit') {
				editDraft = null;
			}
			resetForm();
		} else {
			// Backdrop / accidental close — preserve draft
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
		if (formBodies.length === 0) {
			formBodies = [emptyBody()];
		}
	}

	// ── color picker popover ──────────────────────────────────────────────────
	let colorPickerOpen = $state(false);

	function colorDotStyle(colorKey) {
		if (!colorKey) {
			return 'background: #e5e7eb; border-color: #d1d5db;';
		}
		const hue = getHue(colorKey);
		return `background: hsl(${hue} 65% 80%); border-color: hsl(${hue} 45% 60%);`;
	}

	// ── color helpers ─────────────────────────────────────────────────────────
	function noteCardStyle(note) {
		if (!note.color) {
			return '';
		}
		const hue = getHue(note.color);
		return `background: hsl(${hue} 60% 95%); border-color: hsl(${hue} 45% 72%);`;
	}

	function noteHeaderStyle(note) {
		if (!note.color) {
			return '';
		}
		const hue = getHue(note.color);
		return `background: hsl(${hue} 50% 88%);`;
	}

	function swatchStyle(colorKey) {
		const hue = getHue(colorKey);
		return `background: hsl(${hue} 65% 80%); border-color: hsl(${hue} 45% 60%);`;
	}

	// ── date helpers ──────────────────────────────────────────────────────────
	function fmtDate(str) {
		return new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<h1 class="page-title">Notes</h1>

<!-- ── notes grid ─────────────────────────────────────────────────────────── -->
<div class="notes-grid">
	<!-- create card -->
	<button class="note-card create-card" onclick={openCreate}>
		<span class="create-label">+ Create a new note</span>
	</button>

	{#each data.notes as note (note.id)}
		<div class="note-card" style={noteCardStyle(note)} role="button" tabindex="0" onclick={() => openRead(note)} onkeydown={(e) => e.key === 'Enter' && openRead(note)}>
			<div class="note-card-header" style={noteHeaderStyle(note)}>
				<span class="note-title">{note.title || 'Untitled'}</span>
				<form
					method="POST"
					action="?/pin"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
						};
					}}
					onclick={(e) => e.stopPropagation()}
				>
					<input type="hidden" name="id" value={note.id} />
					<button type="submit" class="pin-btn" title={note.pinned ? 'Unpin' : 'Pin'}>
						{note.pinned ? '📌' : '📍'}
					</button>
				</form>
			</div>
			<div class="note-card-body">
				{#if note.summary}
					<p class="note-summary">{note.summary}</p>
				{/if}
				<span class="note-date">{fmtDate(note.updated_at)}</span>
			</div>
		</div>
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
				use:enhance={() => {
					return async ({ update }) => {
						localStorage.removeItem(CREATE_DRAFT_KEY);
						editDraft = null;
						await update();
						await invalidateAll();
						closeModal(true);
					};
				}}
			>
				{#if editingId}
					<input type="hidden" name="id" value={editingId} />
				{/if}

				<div class="title-row">
					<input class="input" type="text" name="title" placeholder="Title" bind:value={formTitle} />
					<button type="button" class="color-dot" style={colorDotStyle(formColor)} title="Pick color" onclick={() => (colorPickerOpen = true)}></button>
				</div>
				<input type="hidden" name="color" value={formColor} />

				<!-- bodies -->
				<button type="button" class="btn-ghost add-body" onclick={() => addBody(true)}>+ Add section</button>
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

				<button type="button" class="btn-ghost add-body" onclick={() => addBody()}>+ Add section</button>

				<div class="modal-footer">
					<button type="button" class="btn btn-cancel" onclick={() => closeModal(true)}>Cancel</button>
					<button type="submit" class="btn btn-save">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── color picker modal ────────────────────────────────────────────────── -->
{#if colorPickerOpen}
	<div class="modal-backdrop color-backdrop" role="button" tabindex="-1" onclick={() => (colorPickerOpen = false)} onkeydown={() => {}}>
		<div class="color-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="color-modal-head">
				<span class="modal-heading">Pick a color</span>
				{#if formColor}
					<button type="button" class="btn-ghost" onclick={() => { formColor = ''; colorPickerOpen = false; }}>✕ Clear</button>
				{/if}
			</div>
			<div class="color-picker-grid">
				{#each COLORS as c (c.key)}
					<button
						type="button"
						class="swatch-lg"
						class:swatch-selected={formColor === c.key}
						style={swatchStyle(c.key)}
						title={c.label}
						onclick={() => { formColor = c.key; colorPickerOpen = false; }}
					>
						<span class="swatch-label">{c.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

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
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								await invalidateAll();
								activeNote = { ...activeNote, pinned: !activeNote.pinned };
							};
						}}
					>
						<input type="hidden" name="id" value={activeNote.id} />
						<button type="submit" class="btn-ghost">{activeNote.pinned ? '📌 Unpin' : '📍 Pin'}</button>
					</form>
					<button class="btn-ghost" onclick={() => openEdit(activeNote)}>✏️ Edit</button>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								await invalidateAll();
								closeModal();
							};
						}}
					>
						<input type="hidden" name="id" value={activeNote.id} />
						<button
							type="submit"
							class="btn-ghost btn-danger"
							onclick={(e) => {
								if (!confirm('Delete this note?')) {
									e.preventDefault();
								}
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
	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 1.25rem;
	}

	/* ── grid ── */
	.notes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.note-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		overflow: hidden;
		cursor: pointer;
		text-align: left;
		transition: box-shadow 0.15s;
	}

	.note-card:hover {
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
	}

	.create-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 110px;
		border-style: dashed;
		color: #9ca3af;
		font-size: 0.95rem;
	}

	.create-card:hover {
		color: #6b7280;
		background: #f9fafb;
	}

	.note-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 0.75rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.note-title {
		font-weight: 600;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pin-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 0;
		line-height: 1;
		flex-shrink: 0;
	}

	.note-card-body {
		padding: 0.6rem 0.75rem;
	}

	.note-summary {
		font-size: 0.82rem;
		color: #4b5563;
		margin-bottom: 0.4rem;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.note-date {
		font-size: 0.72rem;
		color: #9ca3af;
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

	/* ── form ── */
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
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.color-dot:hover {
		transform: scale(1.15);
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
	}

	.form-row {
		display: flex;
		flex-direction: column;
	}

	.input {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
		width: 100%;
	}

	.input:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.input-sm {
		font-size: 0.82rem;
		padding: 0.3rem 0.5rem;
	}

	.textarea {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
		width: 100%;
		resize: vertical;
		font-family: inherit;
	}

	.textarea:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	/* ── color picker modal ── */
	.color-backdrop {
		z-index: 110;
	}

	.color-modal {
		background: #fff;
		border-radius: 12px;
		padding: 1rem;
		width: min(340px, 92vw);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.color-modal-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.color-picker-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.swatch-lg {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.25rem;
		border-radius: 8px;
		border: 2px solid transparent;
		cursor: pointer;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.swatch-lg:hover {
		transform: scale(1.05);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	}

	.swatch-lg.swatch-selected {
		outline: 2px solid #374151;
		outline-offset: 2px;
	}

	.swatch-label {
		font-size: 0.65rem;
		color: #374151;
		font-weight: 500;
	}

	.swatchStyle {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		transition: transform 0.1s;
	}

	/* ── body sections ── */
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

	/* ── footer ── */
	.modal-footer {
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

	.btn-save {
		background: #374151;
		color: #fff;
	}

	.btn-save:hover {
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
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
	}

	.btn-ghost:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #374151;
	}

	.btn-danger:hover {
		color: #dc2626;
	}

	/* ── read view ── */
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
</style>
