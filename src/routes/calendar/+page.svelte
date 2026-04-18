<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import CalendarStrip from '$lib/CalendarStrip.svelte';
	import LocationPicker from '$lib/LocationPicker.svelte';

	let { data } = $props();

	// ── calendar grid helpers ─────────────────────────────────────────────────
	const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let calDays = $derived.by(() => {
		const { year, month } = data;
		const firstDay = new Date(year, month - 1, 1).getDay();
		const daysInMonth = new Date(year, month, 0).getDate();
		const days = [];
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}
		for (let d = 1; d <= daysInMonth; d++) {
			days.push(d);
		}
		return days;
	});

	function entriesForDay(day) {
		if (!day) return [];
		const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return data.entries.filter((e) => e.start_time.startsWith(dateStr)).sort((a, b) => a.start_time.localeCompare(b.start_time));
	}

	function isToday(day) {
		if (!day) return false;
		const today = new Date();
		return today.getFullYear() === data.year && today.getMonth() + 1 === data.month && today.getDate() === day;
	}

	function prevMonth() {
		let y = data.year, m = data.month - 1;
		if (m < 1) { m = 12; y--; }
		goto(`/calendar?year=${y}&month=${m}`);
	}

	function nextMonth() {
		let y = data.year, m = data.month + 1;
		if (m > 12) { m = 1; y++; }
		goto(`/calendar?year=${y}&month=${m}`);
	}

	// ── modals ────────────────────────────────────────────────────────────────
	let dayModal = $state(null); // { day, entries }
	let entryModal = $state(null); // null | 'show' | 'form'
	let activeEntry = $state(null);

	function openDay(day) {
		const entries = entriesForDay(day);
		dayModal = { day, entries };
	}

	async function openEntry(entry) {
		const res = await fetch(`?/loadEntry`, {
			method: 'POST',
			body: new URLSearchParams({ id: String(entry.id) }),
			headers: { 'x-sveltekit-action': '1' }
		});
		const result = deserialize(await res.text());
		activeEntry = result?.data?.entry ?? entry;
		entryModal = 'show';
	}

	function openCreate(day = null) {
		activeEntry = null;
		formTitle = '';
		formLocationId = '';
		formDescription = '';
		formDuration = 60;
		if (day) {
			const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			formStartTime = `${dateStr}T09:00`;
		} else {
			const now = new Date();
			formStartTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T09:00`;
		}
		entryModal = 'form';
	}

	function openEdit(entry) {
		activeEntry = entry;
		formTitle = entry.title;
		formLocationId = entry.location_id ? String(entry.location_id) : '';
		formDescription = entry.description ?? '';
		formDuration = Math.round((new Date(entry.end_time) - new Date(entry.start_time)) / 60000);
		const d = new Date(entry.start_time);
		formStartTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
		entryModal = 'form';
	}

	// ── form state ────────────────────────────────────────────────────────────
	let formTitle = $state('');
	let formLocationId = $state('');
	let formDescription = $state('');
	let formStartTime = $state('');
	let formDuration = $state(60);

	const DURATION_OPTIONS = [
		{ label: '15 min', value: 15 }, { label: '30 min', value: 30 }, { label: '45 min', value: 45 },
		{ label: '1 hr', value: 60 }, { label: '1 hr 15 min', value: 75 }, { label: '1 hr 30 min', value: 90 },
		{ label: '1 hr 45 min', value: 105 }, { label: '2 hr', value: 120 }, { label: '2 hr 30 min', value: 150 },
		{ label: '3 hr', value: 180 }, { label: '3 hr 30 min', value: 210 }, { label: '4 hr', value: 240 },
		{ label: '5 hr', value: 300 }, { label: '6 hr', value: 360 }, { label: '8 hr', value: 480 },
		{ label: '10 hr', value: 600 }, { label: '12 hr', value: 720 }
	];

	// ── display helpers ───────────────────────────────────────────────────────
	function fmtTime(str) {
		return new Date(str).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
	}

	function fmtDate(str) {
		return new Date(str).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
	}

	function fmtTimeRange(entry) {
		return `${fmtDate(entry.start_time)}, ${fmtTime(entry.start_time)} – ${fmtTime(entry.end_time)}`;
	}

	function mapsUrl(address) {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
	}

	function stripDate(str) {
		const d = new Date(str);
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
</script>

<!-- ── header ── -->
<div class="cal-header">
	<h1>Calendar</h1>
	<div class="cal-nav">
		<button class="btn-ghost" onclick={prevMonth}>‹</button>
		<span class="cal-month-label">{MONTH_NAMES[data.month - 1]} {data.year}</span>
		<button class="btn-ghost" onclick={nextMonth}>›</button>
	</div>
	<button class="btn btn-primary" onclick={() => openCreate()}>+ New Event</button>
</div>

<!-- ── month grid ── -->
<div class="cal-grid">
	{#each DAY_NAMES as d}
		<div class="cal-day-name">{d}</div>
	{/each}
	{#each calDays as day}
		<div class="cal-cell" class:today={isToday(day)} class:empty-cell={!day} onclick={() => day && openDay(day)} role={day ? 'button' : undefined} tabindex={day ? 0 : undefined} onkeydown={(e) => e.key === 'Enter' && day && openDay(day)}>
			{#if day}
				<span class="cal-day-num">{day}</span>
				{#each entriesForDay(day) as entry}
					<span class="cal-entry-pill">{entry.title}</span>
				{/each}
			{/if}
		</div>
	{/each}
</div>

<CalendarStrip entries={data.stripEntries} onChipClick={openEntry} />

<!-- ── day modal ── -->
{#if dayModal}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={() => (dayModal = null)} onkeydown={() => {}}>
		<div class="modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="modal-toolbar">
				<span class="modal-heading">{MONTH_NAMES[data.month - 1]} {dayModal.day}, {data.year}</span>
				<div class="modal-actions">
					<button class="btn-ghost" onclick={() => { openCreate(dayModal.day); dayModal = null; }}>+ New</button>
					<button class="btn-ghost" onclick={() => (dayModal = null)}>✕</button>
				</div>
			</div>
			{#if dayModal.entries.length === 0}
				<p class="empty-day">No events this day.</p>
			{:else}
				<div class="day-entry-list">
					{#each dayModal.entries as entry (entry.id)}
						<button class="day-entry-row" onclick={() => { openEntry(entry); dayModal = null; }}>
							<span class="day-entry-time">{fmtTime(entry.start_time)} – {fmtTime(entry.end_time)}</span>
							<span class="day-entry-title">{entry.title}</span>
							{#if entry.location_name}
								<span class="day-entry-loc">📍 {entry.location_name}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ── entry show modal ── -->
{#if entryModal === 'show' && activeEntry}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={() => { entryModal = null; activeEntry = null; }} onkeydown={() => {}}>
		<div class="modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="modal-toolbar">
				<span class="modal-heading">{activeEntry.title}</span>
				<div class="modal-actions">
					<button class="btn-ghost" onclick={() => openEdit(activeEntry)}>✏️ Edit</button>
					<form method="POST" action="?/duplicate" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
						<input type="hidden" name="id" value={activeEntry.id} />
						<button type="submit" class="btn-ghost">⧉ Duplicate</button>
					</form>
					<button class="btn-ghost" onclick={() => { entryModal = null; activeEntry = null; }}>✕</button>
				</div>
			</div>
			<div class="entry-body">
				<p class="entry-time-range">{fmtTimeRange(activeEntry)}</p>
				{#if activeEntry.location_name}
					<a class="entry-location" href={mapsUrl(activeEntry.location_address ?? activeEntry.location_name)} target="_blank" rel="noopener noreferrer">
						📍 {activeEntry.location_name}
					</a>
				{/if}
				{#if activeEntry.description}
					<p class="entry-description">{activeEntry.description}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- ── entry form modal ── -->
{#if entryModal === 'form'}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={() => (entryModal = activeEntry ? 'show' : null)} onkeydown={() => {}}>
		<div class="modal modal-form" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="modal-toolbar">
				<span class="modal-heading">{activeEntry ? 'Edit Event' : 'New Event'}</span>
				<div class="modal-actions">
					{#if activeEntry}
						<form
							method="POST"
							action="?/delete"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									await invalidateAll();
									entryModal = null;
									activeEntry = null;
								};
							}}
						>
							<input type="hidden" name="id" value={activeEntry.id} />
							<button
								type="submit"
								class="btn-ghost btn-danger"
								onclick={(e) => { if (!confirm('Delete this event?')) e.preventDefault(); }}
							>
								🗑 Delete
							</button>
						</form>
					{/if}
					<button class="btn-ghost" onclick={() => (entryModal = activeEntry ? 'show' : null)}>✕</button>
				</div>
			</div>
			<form
				method="POST"
				action="?/save"
				class="entry-form"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						await invalidateAll();
						entryModal = null;
						activeEntry = null;
					};
				}}
			>
				{#if activeEntry}
					<input type="hidden" name="id" value={activeEntry.id} />
				{/if}

				<div class="field">
					<label for="ev-title">Title</label>
					<input id="ev-title" class="input" type="text" name="title" bind:value={formTitle} required />
				</div>

				<div class="field-row">
					<div class="field">
						<label for="ev-start">Date & Time</label>
						<input id="ev-start" class="input" type="datetime-local" name="start_time" bind:value={formStartTime} required />
					</div>
					<div class="field">
						<label for="ev-dur">Duration</label>
						<select id="ev-dur" class="input" name="duration_minutes" bind:value={formDuration}>
							{#each DURATION_OPTIONS as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="field">
					<label>Location</label>
					<LocationPicker locations={data.locations} bind:value={formLocationId} />
				</div>

				<div class="field">
					<label for="ev-desc">Description</label>
					<textarea id="ev-desc" class="input textarea" name="description" rows="3" bind:value={formDescription}></textarea>
				</div>

				<div class="form-footer">
					<button type="button" class="btn btn-cancel" onclick={() => (entryModal = activeEntry ? 'show' : null)}>Cancel</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* ── header ── */
	.cal-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin-right: auto;
	}

	.cal-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.cal-month-label {
		font-weight: 600;
		font-size: 1rem;
		min-width: 160px;
		text-align: center;
		color: #374151;
	}

	/* ── month grid ── */
	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1px;
		background: #e5e7eb;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 1.5rem;
	}

	.cal-day-name {
		background: #f3f4f6;
		text-align: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		padding: 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.cal-cell {
		background: #fff;
		min-height: 90px;
		padding: 0.4rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		transition: background 0.1s;
	}

	.cal-cell:hover {
		background: #f9fafb;
	}

	.cal-cell.empty-cell {
		cursor: default;
		background: #fafafa;
	}

	.cal-cell.today {
		background: #eff6ff;
	}

	.cal-cell.today .cal-day-num {
		background: #3b82f6;
		color: #fff;
		border-radius: 50%;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
	}

	.cal-day-num {
		font-size: 0.82rem;
		font-weight: 600;
		color: #374151;
		line-height: 1;
		align-self: flex-start;
	}

	.cal-entry-pill {
		font-size: 0.7rem;
		background: #dbeafe;
		color: #1d4ed8;
		border-radius: 3px;
		padding: 0.1rem 0.3rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}


	/* ── modals ── */
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
		width: min(520px, 95vw);
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
	}

	.modal-form {
		width: min(540px, 95vw);
	}

	.modal-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.85rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		flex-shrink: 0;
	}

	.modal-heading {
		font-weight: 700;
		font-size: 1rem;
		color: #1f2937;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.modal-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	/* ── entry show ── */
	.entry-body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		overflow-y: auto;
	}

	.entry-time-range {
		font-size: 0.88rem;
		color: #374151;
		font-weight: 500;
	}

	.entry-location {
		font-size: 0.85rem;
		color: #2563eb;
		text-decoration: none;
	}

	.entry-location:hover {
		text-decoration: underline;
	}

	.entry-description {
		font-size: 0.9rem;
		color: #4b5563;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	/* ── day modal ── */
	.empty-day {
		padding: 1rem 1.1rem;
		color: #9ca3af;
		font-size: 0.9rem;
	}

	.day-entry-list {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.day-entry-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		padding: 0.65rem 1.1rem;
		border-bottom: 1px solid #f3f4f6;
		cursor: pointer;
		text-align: left;
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		transition: background 0.1s;
	}

	.day-entry-row:last-child {
		border-bottom: none;
	}

	.day-entry-row:hover {
		background: #f9fafb;
	}

	.day-entry-time {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 600;
	}

	.day-entry-title {
		font-size: 0.92rem;
		font-weight: 600;
		color: #1f2937;
	}

	.day-entry-loc {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* ── entry form ── */
	.entry-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1rem 1.1rem 1.25rem;
		overflow-y: auto;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #374151;
	}

	.input {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
		width: 100%;
		font-family: inherit;
	}

	.input:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.textarea {
		resize: vertical;
	}

	.form-footer {
		display: flex;
		justify-content: space-between;
	}

	/* ── buttons ── */
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
</style>
