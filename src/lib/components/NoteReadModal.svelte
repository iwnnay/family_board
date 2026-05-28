<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { fmtDate } from '$lib/format.js';
	import { noteCardStyle, noteHeaderStyle } from '$lib/color-styles.js';

	let { note, onClose, onEdit } = $props();
</script>

<div class="modal-overlay" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<div class="note-modal" style={noteCardStyle(note)} role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
		<div class="note-modal-toolbar" style={noteHeaderStyle(note)}>
			<span class="note-modal-title">{note.title || 'Untitled'}</span>
			<div class="note-modal-actions">
				<form method="POST" action="/notes?/pin" use:enhance={() => () => invalidateAll()}>
					<input type="hidden" name="id" value={note.id} />
					<button type="submit" class="btn-ghost">{note.pinned ? '📌 Unpin' : '📍 Pin'}</button>
				</form>
				<button class="btn-ghost" onclick={() => onEdit?.(note)}>✏️ Edit</button>
				<button class="btn-ghost" onclick={onClose}>✕</button>
			</div>
		</div>
		<div class="note-read-body">
			<p class="note-read-date">Updated {fmtDate(note.updated_at)}</p>
			{#each note.bodies ?? [] as section (section.id)}
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

	@media (max-width: 640px) {
		.note-modal {
			width: 95vw;
			max-height: 90vh;
		}
	}
</style>
