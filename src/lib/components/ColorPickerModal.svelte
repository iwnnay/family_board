<script>
	import { COLORS } from '$lib/colors.js';
	import { swatchStyle } from '$lib/color-styles.js';
	import Modal from './Modal.svelte';

	let { open = $bindable(false), selected = '', onPick, title = 'Pick a color' } = $props();

	function pick(key) {
		onPick?.(key);
		open = false;
	}
</script>

<Modal {open} onClose={() => (open = false)} {title} width={340} zIndex={110}>
	<div class="swatch-grid">
		{#each COLORS as c (c.key)}
			<button type="button" class="swatch-lg" class:swatch-selected={selected === c.key} style={swatchStyle(c.key)} onclick={() => pick(c.key)}>
				<span class="swatch-label">{c.label}</span>
			</button>
		{/each}
	</div>
</Modal>
