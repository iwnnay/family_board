<script>
	let { data } = $props();
	let { stats } = data;
</script>

<h1>Stats</h1>

<div class="stats-grid">
	<div class="stat-card">
		<div class="stat-icon">🏆</div>
		<div class="stat-label">Most Daily Chores (All Time)</div>
		{#if stats.mostDailyChores}
			<div class="stat-value">{stats.mostDailyChores.name}</div>
			<div class="stat-sub">{stats.mostDailyChores.count} completed</div>
		{:else}
			<div class="stat-empty">No data yet</div>
		{/if}
	</div>

	<div class="stat-card">
		<div class="stat-icon">📅</div>
		<div class="stat-label">Most Chores This Month</div>
		{#if stats.mostThisMonth}
			<div class="stat-value">{stats.mostThisMonth.name}</div>
			<div class="stat-sub">{stats.mostThisMonth.count} completed</div>
		{:else}
			<div class="stat-empty">No data yet</div>
		{/if}
	</div>

	<div class="stat-card highlight">
		<div class="stat-icon">📋</div>
		<div class="stat-label">Chores Needing Attention</div>
		<div class="stat-value big">{stats.dueCount}</div>
		<div class="stat-sub">{stats.dueCount === 1 ? 'chore' : 'chores'} to do</div>
	</div>
</div>

<style>
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 1.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: #fff;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.stat-card.highlight {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.stat-icon {
		font-size: 1.75rem;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
		font-weight: 600;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.stat-value.big {
		font-size: 2.5rem;
		color: #3b82f6;
	}

	.stat-sub {
		font-size: 0.85rem;
		color: #64748b;
	}

	.stat-empty {
		font-size: 0.9rem;
		color: #cbd5e1;
		font-style: italic;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 1.35rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.stat-card {
			padding: 1rem;
		}
	}
</style>
