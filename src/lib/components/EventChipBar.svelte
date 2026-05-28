<script>
	import { fmtTime } from '$lib/format.js';

	let { events = [], onChipClick } = $props();
</script>

{#if events.length > 0}
	<div class="events-bar">
		{#each events as ev (ev.id)}
			<button class="event-chip" onclick={() => onChipClick?.(ev)}>
				<span class="event-msg">{ev.message}</span>
				<span class="event-time">{fmtTime(ev.created_at)}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
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
</style>
