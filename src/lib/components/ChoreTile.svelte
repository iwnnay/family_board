<script>
	import { completedStyle } from '$lib/color-styles.js';

	const FREQ_LABELS = {
		none: 'Once',
		daily: 'Daily',
		weekly: 'Weekly',
		monthly: 'Monthly',
		yearly: 'Yearly'
	};

	const FREQ_BADGE = {
		none: { bg: '#dbeafe', text: '#1d4ed8' },
		daily: { bg: '#dcfce7', text: '#15803d' },
		weekly: { bg: '#ffedd5', text: '#c2410c' },
		monthly: { bg: '#f3e8ff', text: '#7e22ce' },
		yearly: { bg: '#fee2e2', text: '#b91c1c' }
	};

	let { chore, onClick } = $props();

	let isCompleted = $derived(chore.status === 'completed');
</script>

{#if isCompleted}
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
{:else}
	<button class="chore-tile due" onclick={() => onClick?.(chore)}>
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
{/if}

<style>
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

	.completed .chore-name {
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
</style>
