<script>
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { getHue, COLORS } from '$lib/colors.js';
	import CalendarStrip from '$lib/CalendarStrip.svelte';

	let { data } = $props();

	// ── note modals ───────────────────────────────────────────────────────────
	let noteModal = $state(null); // null | 'read' | 'edit'
	let activeNote = $state(null);

	// edit form state
	const emptyBody = () => ({ subtitle: '', body: '' });
	let formTitle = $state('');
	let formColor = $state('');
	let formBodies = $state([emptyBody()]);
	let colorPickerOpen = $state(false);

	async function openEventChip(ev) {
		if (ev.rel_type === 'Cal Event') {
			await openCalendarEntry(ev.rel_id);
		} else {
			await openNote(ev);
		}
	}

	async function openNote(ev) {
		const res = await fetch(`/notes?/loadNote`, {
			method: 'POST',
			body: new URLSearchParams({ id: String(ev.rel_id) }),
			headers: { 'x-sveltekit-action': '1' }
		});
		const result = deserialize(await res.text());
		if (result?.data?.note) {
			activeNote = result.data.note;
			noteModal = 'read';
		}
	}

	// ── calendar entry modal ──────────────────────────────────────────────────
	let activeCalEntry = $state(null);

	async function openCalendarEntry(id) {
		const res = await fetch(`?/loadCalendarEntry`, {
			method: 'POST',
			body: new URLSearchParams({ id: String(id) }),
			headers: { 'x-sveltekit-action': '1' }
		});
		const result = deserialize(await res.text());
		if (result?.data?.entry) {
			activeCalEntry = result.data.entry;
		}
	}

	function fmtCalTime(str) {
		return new Date(str).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
	}

	function fmtCalDate(str) {
		return new Date(str).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
	}

	function calStripDate(str) {
		const d = new Date(str);
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function mapsUrl(address) {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
	}

	function openEdit(note) {
		formTitle = note.title ?? '';
		formColor = note.color ?? '';
		formBodies = note.bodies?.length ? note.bodies.map((b) => ({ subtitle: b.subtitle ?? '', body: b.body ?? '' })) : [emptyBody()];
		noteModal = 'edit';
	}

	function closeNoteModal() {
		noteModal = null;
		activeNote = null;
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

	function noteCardStyle(note) {
		if (!note.color) return '';
		const hue = getHue(note.color);
		return `background: hsl(${hue} 60% 95%); border-color: hsl(${hue} 45% 72%);`;
	}

	function noteHeaderStyle(note) {
		if (!note.color) return '';
		const hue = getHue(note.color);
		return `background: hsl(${hue} 50% 88%);`;
	}

	function colorDotStyle(colorKey) {
		if (!colorKey) return 'background: #e5e7eb; border-color: #d1d5db;';
		const hue = getHue(colorKey);
		return `background: hsl(${hue} 65% 80%); border-color: hsl(${hue} 45% 60%);`;
	}

	function swatchStyle(colorKey) {
		const hue = getHue(colorKey);
		return `background: hsl(${hue} 65% 80%); border-color: hsl(${hue} 45% 60%);`;
	}

	function fmtDate(str) {
		return new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const FREQ_LABELS = {
		none: 'Once',
		daily: 'Daily',
		weekly: 'Weekly',
		monthly: 'Monthly',
		yearly: 'Yearly'
	};

	// Pastel bubble colors for each frequency badge
	const FREQ_BADGE = {
		none: { bg: '#dbeafe', text: '#1d4ed8' },
		daily: { bg: '#dcfce7', text: '#15803d' },
		weekly: { bg: '#ffedd5', text: '#c2410c' },
		monthly: { bg: '#f3e8ff', text: '#7e22ce' },
		yearly: { bg: '#fee2e2', text: '#b91c1c' }
	};

	async function submitAction(action, formData) {
		const response = await fetch(action, {
			method: 'POST',
			body: formData,
			headers: { 'x-sveltekit-action': '1' }
		});
		const result = deserialize(await response.text());
		if (result.type === 'success' || result.type === 'redirect') {
			await invalidateAll();
		}
		applyAction(result);
	}

	async function handleChoreClick(chore) {
		if (chore.status === 'completed') return;
		const fd = new FormData();
		fd.set('chore_id', chore.id);
		await submitAction('?/complete', fd);
	}

	function completedStyle(chore) {
		const hue = getHue(chore.completed_by_color);
		return [`background: hsl(${hue} 60% 95%)`, `border-color: hsl(${hue} 45% 85%)`, `--done-text: hsl(${hue} 55% 38%)`].join('; ');
	}

	let dueChores = $derived(data.chores.filter((c) => c.status === 'due'));
	let completedChores = $derived(data.chores.filter((c) => c.status === 'completed'));
</script>

{#if data.events.length > 0}
	<div class="events-bar">
		{#each data.events as ev (ev.id)}
			<button class="event-chip" onclick={() => openEventChip(ev)}>
				<span class="event-msg">{ev.message}</span>
				<span class="event-time">{new Date(ev.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
			</button>
		{/each}
	</div>
{/if}

<div class="page-header">
	<h1>Chores</h1>
</div>

{#if data.family.length === 0}
	<div class="empty-state">
		<p>Add family members in <a href="/manage-family">Manage Family</a> to get started.</p>
	</div>
{:else if data.chores.length === 0}
	<div class="empty-state">
		<p>No chores yet! Add some in <a href="/manage-chores">Manage Chores</a>.</p>
	</div>
{:else}
	{#if dueChores.length > 0}
		<div class="chore-grid">
			{#each dueChores as chore (chore.id)}
				<button class="chore-tile due" onclick={() => handleChoreClick(chore)}>
					{#if chore.image}
						<img src="/store/images/chores/{chore.image}" alt={chore.name} class="chore-img" />
					{/if}
					<span class="chore-name">{chore.name}</span>
					<span class="freq-bubble" style="background: {FREQ_BADGE[chore.frequency].bg}; color: {FREQ_BADGE[chore.frequency].text}">
						{FREQ_LABELS[chore.frequency]}
					</span>
					{#if chore.suggested_day}
						<span class="chore-day">{chore.suggested_day}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	{#if completedChores.length > 0}
		<h2 class="section-label">Recently Completed</h2>
		<div class="chore-grid">
			{#each completedChores as chore (chore.id)}
				<div class="chore-tile completed" style={completedStyle(chore)}>
					{#if chore.image}
						<img src="/store/images/chores/{chore.image}" alt={chore.name} class="chore-img" />
					{/if}
					<span class="chore-name">{chore.name}</span>
					<span class="freq-bubble" style="background: {FREQ_BADGE[chore.frequency].bg}; color: {FREQ_BADGE[chore.frequency].text}; opacity: 0.6">
						{FREQ_LABELS[chore.frequency]}
					</span>
					<span class="chore-done">✓ {chore.completed_by_name}</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<CalendarStrip entries={data.calendarEntries} onChipClick={(entry) => openCalendarEntry(entry.id)} label="Upcoming Events" />

<!-- ── note read modal ────────────────────────────────────────────────────── -->
{#if noteModal === 'read' && activeNote}
	<div class="modal-overlay" role="button" tabindex="-1" onclick={closeNoteModal} onkeydown={() => {}}>
		<div class="note-modal" style={noteCardStyle(activeNote)} role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="note-modal-toolbar" style={noteHeaderStyle(activeNote)}>
				<span class="note-modal-title">{activeNote.title || 'Untitled'}</span>
				<div class="note-modal-actions">
					<form method="POST" action="/notes?/pin" use:enhance={() => () => invalidateAll()}>
						<input type="hidden" name="id" value={activeNote.id} />
						<button type="submit" class="btn-ghost">{activeNote.pinned ? '📌 Unpin' : '📍 Pin'}</button>
					</form>
					<button class="btn-ghost" onclick={() => openEdit(activeNote)}>✏️ Edit</button>
					<button class="btn-ghost" onclick={closeNoteModal}>✕</button>
				</div>
			</div>
			<div class="note-read-body">
				<p class="note-read-date">Updated {fmtDate(activeNote.updated_at)}</p>
				{#each activeNote.bodies ?? [] as section (section.id)}
					{#if section.subtitle}
						<h4 class="note-section-subtitle">{section.subtitle}</h4>
					{/if}
					{#if section.body}
						<p class="note-section-body">{section.body}</p>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- ── note edit modal ────────────────────────────────────────────────────── -->
{#if noteModal === 'edit' && activeNote}
	<div class="modal-overlay" role="button" tabindex="-1" onclick={() => (noteModal = 'read')} onkeydown={() => {}}>
		<div class="note-modal note-modal-form" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="note-modal-toolbar">
				<span class="note-modal-title">Edit note</span>
			</div>
			<form
				method="POST"
				action="/notes?/save"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						await invalidateAll();
						closeNoteModal();
					};
				}}
				class="note-edit-form"
			>
				<input type="hidden" name="id" value={activeNote.id} />

				<div class="note-title-row">
					<input class="note-input" type="text" name="title" placeholder="Title" bind:value={formTitle} />
					<button type="button" class="color-dot" style={colorDotStyle(formColor)} title="Pick color" onclick={() => (colorPickerOpen = true)}></button>
				</div>
				<input type="hidden" name="color" value={formColor} />

				<button type="button" class="btn-ghost add-body-btn" onclick={() => addBody(true)}>+ Add section</button>
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
				<button type="button" class="btn-ghost add-body-btn" onclick={() => addBody()}>+ Add section</button>

				<div class="note-edit-footer">
					<button type="button" class="btn btn-cancel" onclick={() => (noteModal = 'read')}>Cancel</button>
					<button type="submit" class="btn btn-save">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── color picker modal ─────────────────────────────────────────────────── -->
{#if colorPickerOpen}
	<div class="modal-overlay color-overlay" role="button" tabindex="-1" onclick={() => (colorPickerOpen = false)} onkeydown={() => {}}>
		<div class="color-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="color-modal-head">
				<span class="note-modal-title">Pick a color</span>
				{#if formColor}
					<button
						type="button"
						class="btn-ghost"
						onclick={() => {
							formColor = '';
							colorPickerOpen = false;
						}}>✕ Clear</button
					>
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
						onclick={() => {
							formColor = c.key;
							colorPickerOpen = false;
						}}
					>
						<span class="swatch-label">{c.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- ── calendar entry modal ──────────────────────────────────────────────── -->
{#if activeCalEntry}
	<div class="modal-overlay" role="button" tabindex="-1" onclick={() => (activeCalEntry = null)} onkeydown={() => {}}>
		<div class="cal-entry-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="cal-entry-toolbar">
				<span class="cal-entry-title">{activeCalEntry.title}</span>
				<div class="cal-entry-actions">
					<a href="/calendar" class="btn-ghost">Open Calendar</a>
					<button class="btn-ghost" onclick={() => (activeCalEntry = null)}>✕</button>
				</div>
			</div>
			<div class="cal-entry-body">
				<p class="cal-entry-time">{fmtCalDate(activeCalEntry.start_time)}, {fmtCalTime(activeCalEntry.start_time)} – {fmtCalTime(activeCalEntry.end_time)}</p>
				{#if activeCalEntry.location_name}
					<a class="cal-entry-loc" href={mapsUrl(activeCalEntry.location_address ?? activeCalEntry.location_name)} target="_blank" rel="noopener noreferrer">
						📍 {activeCalEntry.location_name}
					</a>
				{/if}
				{#if activeCalEntry.description}
					<p class="cal-entry-desc">{activeCalEntry.description}</p>
				{/if}
			</div>
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
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
	}

	#who-dis {
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: 2px solid;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	#who-dis.unselected {
		border-color: #fca5a5;
		background: #fef2f2;
		color: #dc2626;
	}

	#who-dis.selected {
		border-color: var(--c-member-border);
		background: var(--c-member-bg);
		color: var(--c-member-text);
	}

	.section-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #94a3b8;
		margin: 1.5rem 0 0.75rem;
	}

	.chore-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	/* Base tile */
	.chore-tile {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		border-radius: 10px;
		border: 1.5px solid;
		text-align: left;
		overflow: hidden;
	}

	/* Due — neutral gray */
	.chore-tile.due {
		background: #f8fafc;
		border-color: #e2e8f0;
		cursor: pointer;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.chore-tile.due:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.chore-tile.due:active {
		transform: translateY(0);
	}

	/* Completed — color comes from inline style */
	.chore-tile.completed {
		cursor: default;
	}

	.chore-img {
		width: calc(100% + 1.5rem);
		height: 110px;
		object-fit: cover;
		border-radius: 8px 8px 0 0;
		margin: -0.75rem -0.75rem 0.5rem;
	}

	.chore-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #374151;
		line-height: 1.3;
	}

	.chore-tile.completed .chore-name {
		color: var(--done-text);
	}

	.freq-bubble {
		display: inline-block;
		align-self: flex-start;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.45rem;
		border-radius: 99px;
	}

	.chore-day {
		font-size: 0.72rem;
		color: #94a3b8;
	}

	.chore-done {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--done-text);
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #94a3b8;
	}

	.events-bar {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.75rem;
		margin-bottom: 1rem;
		scrollbar-width: thin;
	}

	.event-chip {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		padding: 0.4rem 0.75rem;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		text-decoration: none;
		transition: background 0.15s;
	}

	.event-chip:hover {
		background: #f3f4f6;
	}

	.event-msg {
		font-weight: 600;
		color: #374151;
	}

	.event-time {
		color: #9ca3af;
		font-size: 0.72rem;
	}

	.empty-state a {
		color: #3b82f6;
		text-decoration: underline;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.modal {
		background: #fff;
		border-radius: 14px;
		padding: 2rem;
		max-width: 340px;
		width: 90%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.modal h2 {
		font-size: 1.4rem;
		margin-bottom: 0.35rem;
	}

	.modal p {
		color: #64748b;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.member-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-btn {
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.member-btn:hover {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	/* ── note read modal ── */
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
		border-radius: 12px 12px 0 0;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		flex-shrink: 0;
	}

	.note-modal-title {
		font-weight: 700;
		font-size: 1rem;
		color: #1f2937;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.note-modal-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
		align-items: center;
	}

	.note-read-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		overflow-y: auto;
		flex: 1;
	}

	.note-read-date {
		font-size: 0.78rem;
		color: #9ca3af;
	}

	.note-section-subtitle {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin-top: 0.5rem;
	}

	.note-section-body {
		font-size: 0.92rem;
		color: #4b5563;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	.btn-ghost {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.82rem;
		color: #6b7280;
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		text-decoration: none;
	}

	.btn-ghost:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #374151;
	}

	/* ── note edit modal ── */
	.note-modal-form {
		padding: 0;
	}

	.note-edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem 1.25rem;
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

	/* ── color picker ── */
	.color-overlay {
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
		transition:
			transform 0.1s,
			box-shadow 0.1s;
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

	/* ── calendar entry modal ── */
	.cal-entry-modal {
		background: #fff;
		border-radius: 12px;
		width: min(520px, 95vw);
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
	}

	.cal-entry-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.85rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		flex-shrink: 0;
	}

	.cal-entry-title {
		font-weight: 700;
		font-size: 1rem;
		color: #1f2937;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cal-entry-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
		align-items: center;
	}

	.cal-entry-body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		overflow-y: auto;
		flex: 1;
	}

	.cal-entry-time {
		font-size: 0.88rem;
		color: #374151;
		font-weight: 500;
	}

	.cal-entry-loc {
		font-size: 0.85rem;
		color: #2563eb;
		text-decoration: none;
	}

	.cal-entry-loc:hover {
		text-decoration: underline;
	}

	.cal-entry-desc {
		font-size: 0.9rem;
		color: #4b5563;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	/* ── mobile ── */
	@media (max-width: 640px) {
		h1 {
			font-size: 1.35rem;
		}

		.page-header {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.chore-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 0.5rem;
		}

		.modal {
			max-width: 95vw;
		}

		.note-modal,
		.cal-entry-modal {
			width: 95vw;
			max-height: 90vh;
		}
	}
</style>
