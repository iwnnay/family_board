<script>
	import { deserialize } from '$app/forms';
	import CalendarStrip from '$lib/CalendarStrip.svelte';
	import ChoreGrid from '$lib/components/ChoreGrid.svelte';
	import EventChipBar from '$lib/components/EventChipBar.svelte';
	import NoteReadModal from '$lib/components/NoteReadModal.svelte';
	import NoteEditModal from '$lib/components/NoteEditModal.svelte';
	import CalendarEntryModal from '$lib/components/CalendarEntryModal.svelte';
	import { submitAction } from '$lib/form-helpers.js';

	let { data } = $props();

	let noteModal = $state(null); // null | 'read' | 'edit'
	let activeNote = $state(null);
	let activeCalEntry = $state(null);

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

	function closeNoteModal() {
		noteModal = null;
		activeNote = null;
	}

	async function handleChoreClick(chore) {
		if (chore.status === 'completed') {return;}
		const fd = new FormData();
		fd.set('chore_id', chore.id);
		await submitAction('?/complete', fd);
	}

	let dueChores = $derived(data.chores.filter((c) => c.status === 'due'));
	let completedChores = $derived(data.chores.filter((c) => c.status === 'completed'));
</script>

<EventChipBar events={data.events} onChipClick={openEventChip} />

<div class="page-header">
	<h1 class="page-title-lg">Chores</h1>
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
		<ChoreGrid chores={dueChores} onChoreClick={handleChoreClick} />
	{/if}

	{#if completedChores.length > 0}
		<h2 class="section-label">Recently Completed</h2>
		<ChoreGrid chores={completedChores} />
	{/if}
{/if}

<CalendarStrip entries={data.calendarEntries} onChipClick={(entry) => openCalendarEntry(entry.id)} label="Upcoming Events" />

{#if noteModal === 'read' && activeNote}
	<NoteReadModal note={activeNote} onClose={closeNoteModal} onEdit={() => (noteModal = 'edit')} />
{/if}

{#if noteModal === 'edit' && activeNote}
	<NoteEditModal note={activeNote} onClose={() => (noteModal = 'read')} onSaved={closeNoteModal} />
{/if}

{#if activeCalEntry}
	<CalendarEntryModal entry={activeCalEntry} onClose={() => (activeCalEntry = null)} />
{/if}

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}
</style>
