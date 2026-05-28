<script>
	let { name, label, hint = '', autocomplete = 'current-password', required = true } = $props();
</script>

<label class="field">
	<span class="field-label">{label}</span>
	<input type="password" {name} {autocomplete} {required} />
	{#if hint}
		<span class="field-hint">{hint}</span>
	{/if}
</label>
