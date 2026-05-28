<script>
	let { open = true, onClose, title = '', width = 520, maxHeight = '90vh', zIndex = 50, toolbar, actions, children } = $props();

	function backdropClick() {
		onClose?.();
	}

	function stopClick(e) {
		e.stopPropagation();
	}
</script>

{#if open}
	<div class="modal-overlay" role="presentation" style="z-index: {zIndex}" onclick={backdropClick}>
		<div class="modal" role="dialog" aria-modal="true" style="width: min({width}px, 95vw); max-height: {maxHeight}" onclick={stopClick}>
			{#if title || toolbar || actions}
				<div class="modal-toolbar">
					{#if toolbar}
						{@render toolbar()}
					{:else}
						<span class="modal-heading">{title}</span>
					{/if}
					{#if actions}
						<div class="modal-actions">
							{@render actions()}
						</div>
					{/if}
				</div>
			{/if}

			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
