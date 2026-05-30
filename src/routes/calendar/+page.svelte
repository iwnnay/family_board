<script>
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import CalendarStrip from '$lib/CalendarStrip.svelte';
	import LocationPicker from '$lib/LocationPicker.svelte';
	import { fmtTime, fmtDateLong } from '$lib/format.js';
	import { parseUtc } from '$lib/time.js';
	import { RECURRENCE_OPTIONS } from '$lib/recurrence.js';

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
		if (!day) {return [];}
		const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		// All-day events sort ahead of timed events; timed events sort by start.
		return data.entries
			.filter((e) => e.start_time.startsWith(dateStr))
			.sort((a, b) => (b.all_day ? 1 : 0) - (a.all_day ? 1 : 0) || a.start_time.localeCompare(b.start_time));
	}

	function isToday(day) {
		if (!day) {return false;}
		const today = new Date();
		return today.getFullYear() === data.year && today.getMonth() + 1 === data.month && today.getDate() === day;
	}

	function prevMonth() {
		let y = data.year,
			m = data.month - 1;
		if (m < 1) {
			m = 12;
			y--;
		}
		goto(`/calendar?year=${y}&month=${m}`);
	}

	function nextMonth() {
		let y = data.year,
			m = data.month + 1;
		if (m > 12) {
			m = 1;
			y++;
		}
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

	// Occurrences already carry every display field (location, description,
	// colour, recurrence), so no refetch is needed — show the clicked occurrence.
	function openEntry(entry) {
		activeEntry = entry;
		entryModal = 'show';
	}

	function dateInputValue(year, month, day) {
		return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function openCreate(day = null) {
		activeEntry = null;
		formTitle = '';
		formLocationId = '';
		formDescription = '';
		formDuration = 60;
		formAllDay = false;
		formRecurrence = 'none';
		formRecurrenceEnd = '';
		const now = new Date();
		const dateStr = day ? dateInputValue(data.year, data.month, day) : dateInputValue(now.getFullYear(), now.getMonth() + 1, now.getDate());
		formStartTime = `${dateStr}T09:00`;
		formAllDayDate = dateStr;
		formAllDayEndDate = dateStr;
		entryModal = 'form';
	}

	function openEdit(entry) {
		activeEntry = entry;
		formTitle = entry.title;
		formLocationId = entry.location_id ? String(entry.location_id) : '';
		formDescription = entry.description ?? '';
		formAllDay = !!entry.all_day;
		formRecurrence = entry.recurrence ?? 'none';
		formRecurrenceEnd = entry.recurrence_end ?? '';
		// Editing a recurring event applies "this and following", so the clicked
		// occurrence is both the split point and the form's starting values.
		if (formAllDay) {
			formAllDayDate = entry.start_time.slice(0, 10);
			formAllDayEndDate = entry.end_time.slice(0, 10);
		} else {
			formDuration = Math.round((parseUtc(entry.end_time) - parseUtc(entry.start_time)) / 60000);
			const d = parseUtc(entry.start_time);
			formStartTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
		}
		entryModal = 'form';
	}

	// ── form state ────────────────────────────────────────────────────────────
	let formTitle = $state('');
	let formLocationId = $state('');
	let formDescription = $state('');
	let formStartTime = $state('');
	let formDuration = $state(60);
	let formAllDay = $state(false);
	let formAllDayDate = $state('');
	let formAllDayEndDate = $state('');
	let formRecurrence = $state('none');
	let formRecurrenceEnd = $state('');

	const DURATION_OPTIONS = [
		{ label: '15 min', value: 15 },
		{ label: '30 min', value: 30 },
		{ label: '45 min', value: 45 },
		{ label: '1 hr', value: 60 },
		{ label: '1 hr 15 min', value: 75 },
		{ label: '1 hr 30 min', value: 90 },
		{ label: '1 hr 45 min', value: 105 },
		{ label: '2 hr', value: 120 },
		{ label: '2 hr 30 min', value: 150 },
		{ label: '3 hr', value: 180 },
		{ label: '3 hr 30 min', value: 210 },
		{ label: '4 hr', value: 240 },
		{ label: '5 hr', value: 300 },
		{ label: '6 hr', value: 360 },
		{ label: '8 hr', value: 480 },
		{ label: '10 hr', value: 600 },
		{ label: '12 hr', value: 720 }
	];

	function fmtTimeRange(entry) {
		return `${fmtDateLong(entry.start_time)}, ${fmtTime(entry.start_time)} – ${fmtTime(entry.end_time)}`;
	}

	// All-day dates are floating strings; format them without timezone conversion.
	function fmtFloatingDate(dateStr) {
		return new Date(`${dateStr.slice(0, 10)}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
	}

	function fmtAllDayRange(entry) {
		const start = entry.start_time.slice(0, 10);
		const end = entry.end_time.slice(0, 10);
		return start === end ? `${fmtFloatingDate(start)} · All day` : `${fmtFloatingDate(start)} – ${fmtFloatingDate(end)} · All day`;
	}

	function recurrenceLabel(entry) {
		if (!entry.recurrence || entry.recurrence === 'none') {
			return '';
		}
		const opt = RECURRENCE_OPTIONS.find((o) => o.value === entry.recurrence);
		const base = opt ? opt.label : '';
		return entry.recurrence_end ? `${base} until ${fmtFloatingDate(entry.recurrence_end)}` : base;
	}

	function mapsUrl(address) {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
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
		<div
			class="cal-cell"
			class:today={isToday(day)}
			class:empty-cell={!day}
			onclick={() => day && openDay(day)}
			role={day ? 'button' : undefined}
			tabindex={day ? 0 : undefined}
			onkeydown={(e) => e.key === 'Enter' && day && openDay(day)}
		>
			{#if day}
				<span class="cal-day-num">{day}</span>
				{#each entriesForDay(day) as entry}
					<span class="cal-entry-pill" class:all-day={entry.all_day}>
						{#if entry.is_recurring}<span class="recur-dot" title="Repeats">↻</span>{/if}{entry.title}
					</span>
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
					<button
						class="btn-ghost"
						onclick={() => {
							openCreate(dayModal.day);
							dayModal = null;
						}}>+ New</button
					>
					<button class="btn-ghost" onclick={() => (dayModal = null)}>✕</button>
				</div>
			</div>
			{#if dayModal.entries.length === 0}
				<p class="empty-day">No events this day.</p>
			{:else}
				<div class="day-entry-list">
					{#each dayModal.entries as entry (entry.id)}
						<button
							class="day-entry-row"
							onclick={() => {
								openEntry(entry);
								dayModal = null;
							}}
						>
							<span class="day-entry-time">{entry.all_day ? 'All day' : `${fmtTime(entry.start_time)} – ${fmtTime(entry.end_time)}`}</span>
							<span class="day-entry-title">{#if entry.is_recurring}<span class="recur-dot" title="Repeats">↻</span> {/if}{entry.title}</span>
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
	<div
		class="modal-backdrop"
		role="button"
		tabindex="-1"
		onclick={() => {
			entryModal = null;
			activeEntry = null;
		}}
		onkeydown={() => {}}
	>
		<div class="modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="modal-toolbar">
				<span class="modal-heading">{activeEntry.title}</span>
				<div class="modal-actions">
					<button class="btn-ghost" onclick={() => openEdit(activeEntry)}>✏️ Edit</button>
					<form
						method="POST"
						action="?/duplicate"
						use:enhance={() =>
							async ({ update }) => {
								await update();
								await invalidateAll();
							}}
					>
						<input type="hidden" name="id" value={activeEntry.id} />
						<button type="submit" class="btn-ghost">⧉ Duplicate</button>
					</form>
					<button
						class="btn-ghost"
						onclick={() => {
							entryModal = null;
							activeEntry = null;
						}}>✕</button
					>
				</div>
			</div>
			<div class="entry-body">
				<p class="entry-time-range">{activeEntry.all_day ? fmtAllDayRange(activeEntry) : fmtTimeRange(activeEntry)}</p>
				{#if recurrenceLabel(activeEntry)}
					<p class="entry-recurrence">↻ {recurrenceLabel(activeEntry)}</p>
				{/if}
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
								onclick={(e) => {
									const msg = activeEntry.is_recurring ? 'Delete this and all future occurrences?' : 'Delete this event?';
									if (!confirm(msg)) {e.preventDefault();}
								}}
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

				{#if activeEntry?.is_recurring}
					<p class="series-note">↻ Changes apply to this and all future occurrences.</p>
				{/if}

				<div class="field">
					<label for="ev-title">Title</label>
					<input id="ev-title" class="input" type="text" name="title" bind:value={formTitle} required />
				</div>

				<label class="checkbox-field">
					<input type="checkbox" name="all_day" bind:checked={formAllDay} />
					<span>All-day event</span>
				</label>

				{#if formAllDay}
					<div class="field-row">
						<div class="field">
							<label for="ev-ad-start">Date</label>
							<input id="ev-ad-start" class="input" type="date" name="all_day_date" bind:value={formAllDayDate} required />
						</div>
						<div class="field">
							<label for="ev-ad-end">End date <span class="opt">(optional)</span></label>
							<input id="ev-ad-end" class="input" type="date" name="all_day_end_date" bind:value={formAllDayEndDate} min={formAllDayDate} />
						</div>
					</div>
				{:else}
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
				{/if}

				<div class="field-row">
					<div class="field">
						<label for="ev-recur">Repeats</label>
						<select id="ev-recur" class="input" name="recurrence" bind:value={formRecurrence}>
							{#each RECURRENCE_OPTIONS as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
					{#if formRecurrence !== 'none'}
						<div class="field">
							<label for="ev-recur-end">Until <span class="opt">(optional)</span></label>
							<input id="ev-recur-end" class="input" type="date" name="recurrence_end" bind:value={formRecurrenceEnd} min={formAllDay ? formAllDayDate : formStartTime.slice(0, 10)} />
						</div>
					{/if}
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

	/* All-day events read as a solid banner to distinguish them from timed pills. */
	.cal-entry-pill.all-day {
		background: #4f46e5;
		color: #fff;
		font-weight: 600;
	}

	.recur-dot {
		font-size: 0.62rem;
		opacity: 0.8;
		margin-right: 1px;
	}

	.entry-recurrence {
		font-size: 0.82rem;
		color: #4f46e5;
		font-weight: 500;
	}

	.series-note {
		margin: 0;
		padding: 0.5rem 0.65rem;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-size: 0.78rem;
		color: #4338ca;
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

	.checkbox-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: #374151;
		cursor: pointer;
	}

	.checkbox-field input {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.opt {
		font-weight: 400;
		color: #9ca3af;
		font-size: 0.72rem;
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

	/* ── mobile ── */
	@media (max-width: 640px) {
		.cal-header {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		h1 {
			font-size: 1.25rem;
			width: 100%;
		}

		.cal-cell {
			min-height: 60px;
			padding: 0.25rem;
		}

		.cal-day-num {
			font-size: 0.72rem;
		}

		.cal-entry-pill {
			font-size: 0.6rem;
			padding: 0.05rem 0.2rem;
		}

		.cal-month-label {
			min-width: 120px;
			font-size: 0.88rem;
		}

		.field-row {
			grid-template-columns: 1fr;
		}
	}
</style>
