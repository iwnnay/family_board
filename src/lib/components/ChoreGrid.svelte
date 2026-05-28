<script>
	import ChoreTile from './ChoreTile.svelte';

	let { chores, onChoreClick } = $props();
</script>

<div class="chore-grid">
	{#each chores as chore (chore.id)}
		<ChoreTile {chore} onClick={onChoreClick} />
	{/each}
</div>

<style>
	.chore-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.chore-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 0.5rem;
		}
	}
</style>
