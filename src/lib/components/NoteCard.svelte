<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { fmtDate } from '$lib/format.js';
	import { noteCardStyle, noteHeaderStyle } from '$lib/color-styles.js';

	let { note, onOpen } = $props();
</script>

<div class="note-card" style={noteCardStyle(note)} role="button" tabindex="0" onclick={() => onOpen?.(note)} onkeydown={(e) => e.key === 'Enter' && onOpen?.(note)}>
	<div class="note-card-header" style={noteHeaderStyle(note)}>
		<span class="note-title">{note.title || 'Untitled'}</span>
		<form
			method="POST"
			action="/notes?/pin"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					await invalidateAll();
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

<style>
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
</style>
