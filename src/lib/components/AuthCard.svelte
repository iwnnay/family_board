<script>
	let { title, subtitle = '', children } = $props();
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1>{title}</h1>
		{#if subtitle}
			<p class="subtitle">{subtitle}</p>
		{/if}
		{@render children()}
	</div>
</div>
