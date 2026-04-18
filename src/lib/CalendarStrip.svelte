<script>
	import { getHue } from '$lib/colors.js';

	let { entries, onChipClick, label = 'Upcoming' } = $props();

	function chipStyle(entry) {
		if (!entry.created_by_color) return '';
		const hue = getHue(entry.created_by_color);
		return `background: hsl(${hue} 60% 94%); border-color: hsl(${hue} 45% 78%);`;
	}

	function fmtDate(str) {
		const d = new Date(str);
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
</script>

{#if entries.length > 0}
	<div class="strip-label">{label}</div>
	<div class="strip">
		{#each entries as entry (entry.id)}
			<button class="chip" style={chipStyle(entry)} onclick={() => onChipClick(entry)}>
				<span class="chip-date">{fmtDate(entry.start_time)}</span>
				<span class="chip-title">{entry.title}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.strip-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #9ca3af;
		margin-bottom: 0.5rem;
	}

	.strip {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		scrollbar-width: thin;
	}

	.chip {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		padding: 0.5rem 0.75rem;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		min-width: 90px;
		transition: box-shadow 0.15s;
	}

	.chip:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.chip-date {
		font-size: 0.72rem;
		font-weight: 700;
		color: #6b7280;
	}

	.chip-title {
		font-size: 0.82rem;
		font-weight: 600;
		color: #1f2937;
	}
</style>
