<script>
	import { COLORS, swatchBg } from '$lib/colors.js';

	/**
	 * Two modes:
	 *  - mode="radio": renders <input type=radio name={name}> for use inside a <form>
	 *  - mode="button": renders <button type=submit name={name} value=color.key>
	 *                  (used when each swatch submits a server action)
	 */
	let { mode = 'radio', name = 'color', selected = $bindable('blue'), onSelect } = $props();

	function handleRadio(key) {
		selected = key;
		onSelect?.(key);
	}
</script>

<div class="swatches">
	{#each COLORS as color (color.key)}
		{#if mode === 'button'}
			<button type="submit" {name} value={color.key} class="swatch" class:active={selected === color.key} style="background: {swatchBg(color.hue)}" title={color.label}>
				{#if selected === color.key}<span class="swatch-check">&#10003;</span>{/if}
			</button>
		{:else}
			<label class="swatch-wrap" title={color.label}>
				<input type="radio" {name} value={color.key} checked={selected === color.key} onchange={() => handleRadio(color.key)} />
				<span class="swatch" style="background: {swatchBg(color.hue)}">
					{#if selected === color.key}<span class="swatch-check">&#10003;</span>{/if}
				</span>
			</label>
		{/if}
	{/each}
</div>
