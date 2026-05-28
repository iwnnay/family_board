<script>
	import { fmtDateLong, fmtTime } from '$lib/format.js';

	let { entry, onClose, openCalendarLink = '/calendar' } = $props();

	function mapsUrl(address) {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
	}
</script>

<div class="modal-overlay" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<div class="cal-entry-modal" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
		<div class="cal-entry-toolbar">
			<span class="cal-entry-title">{entry.title}</span>
			<div class="cal-entry-actions">
				<a href={openCalendarLink} class="btn-ghost">Open Calendar</a>
				<button class="btn-ghost" onclick={onClose}>✕</button>
			</div>
		</div>
		<div class="cal-entry-body">
			<p class="cal-entry-time">
				{fmtDateLong(entry.start_time)}, {fmtTime(entry.start_time)} – {fmtTime(entry.end_time)}
			</p>
			{#if entry.location_name}
				<a class="cal-entry-loc" href={mapsUrl(entry.location_address ?? entry.location_name)} target="_blank" rel="noopener noreferrer">
					📍 {entry.location_name}
				</a>
			{/if}
			{#if entry.description}
				<p class="cal-entry-desc">{entry.description}</p>
			{/if}
		</div>
	</div>
</div>

<style>
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

	@media (max-width: 640px) {
		.cal-entry-modal {
			width: 95vw;
			max-height: 90vh;
		}
	}
</style>
