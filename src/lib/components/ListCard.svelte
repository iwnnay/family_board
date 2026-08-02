<script>
	import { enhance } from '$app/forms';
	import { refreshOnSubmit } from '$lib/form-helpers.js';
	import ListItemRow from '$lib/components/ListItemRow.svelte';

	/**
	 * One list tile: favourite, collapse and delete controls in the header,
	 * then its active items, the add box, and the completed drawer.
	 */
	let { list, memberId = null, collapsed = false, onToggleCollapse, onEditItem } = $props();

	let newItem = $state('');
	let showCompleted = $state(false);

	// Lists made before creators were recorded have no owner — anyone may clear
	// those out; otherwise deleting stays with whoever created the list.
	let canDelete = $derived(list.created_by === null || list.created_by === memberId);
</script>

<section class="list-card" class:favorite={list.favorite} class:collapsed>
	<div class="list-header">
		<form method="POST" action="?/favorite" use:enhance={refreshOnSubmit()} class="fav-form">
			<input type="hidden" name="id" value={list.id} />
			<button type="submit" class="btn-ghost fav-btn" class:on={list.favorite} title={list.favorite ? 'Remove from favorites' : 'Favorite this list'} aria-pressed={list.favorite}>
				{list.favorite ? '★' : '☆'}
			</button>
		</form>

		<button type="button" class="list-title" onclick={() => onToggleCollapse?.(list.id)} title={collapsed ? 'Expand list' : 'Collapse list'}>
			<span class="caret">{collapsed ? '▸' : '▾'}</span>
			<span class="title-text">{list.title}</span>
			<span class="count">{list.active_items.length}</span>
		</button>

		{#if canDelete}
			<form method="POST" action="?/delete" use:enhance={refreshOnSubmit()}>
				<input type="hidden" name="id" value={list.id} />
				<button
					type="submit"
					class="btn-ghost delete-btn"
					title="Delete list"
					onclick={(e) => {
						if (!confirm('Delete this list, all its items, and any photos attached to them?')) {
							e.preventDefault();
						}
					}}>✕</button
				>
			</form>
		{/if}
	</div>

	{#if !collapsed}
		<div class="list-body">
			{#each list.active_items as item (item.id)}
				<ListItemRow {item} onEdit={onEditItem} />
			{/each}

			<form method="POST" action="?/addItem" use:enhance={refreshOnSubmit(() => (newItem = ''))} class="add-item-form">
				<input type="hidden" name="list_id" value={list.id} />
				<div class="add-item-row">
					<input class="input input-sm" type="text" name="item" placeholder="Add item… try “by Thursday”" bind:value={newItem} />
					<button type="submit" class="btn-ghost add-item-btn" disabled={!newItem.trim()}>+</button>
				</div>
			</form>

			{#if list.completed_items.length > 0}
				<button class="btn-ghost completed-toggle" onclick={() => (showCompleted = !showCompleted)}>
					{showCompleted ? '▴' : '▾'}
					{list.completed_items.length} completed
				</button>
				{#if showCompleted}
					<div class="completed-list">
						{#each list.completed_items as item (item.id)}
							<form method="POST" action="?/restoreItem" use:enhance={refreshOnSubmit()}>
								<input type="hidden" name="item_id" value={item.id} />
								<label class="completed-item">
									<input type="checkbox" class="item-checkbox" checked aria-label="Move {item.item} back into the list" onchange={(e) => e.currentTarget.form.requestSubmit()} />
									<span class="completed-text">{item.item}</span>
								</label>
							</form>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</section>

<style>
	.list-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.list-card.favorite {
		border-color: #fcd34d;
		box-shadow: 0 0 0 1px #fcd34d33;
	}

	.list-header {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.4rem 0.5rem 0.4rem 0.35rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.list-card.collapsed .list-header {
		border-bottom: none;
	}

	.fav-form {
		display: flex;
	}

	.fav-btn {
		font-size: 1rem;
		line-height: 1;
		padding: 0.25rem;
		color: #cbd5e1;
	}

	.fav-btn.on {
		color: #f59e0b;
	}

	.list-title {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: none;
		border: none;
		padding: 0.2rem 0.1rem;
		font: inherit;
		font-size: 0.95rem;
		font-weight: 600;
		color: #1f2937;
		cursor: pointer;
		text-align: left;
	}

	.caret {
		font-size: 0.7rem;
		color: #9ca3af;
		flex-shrink: 0;
	}

	.title-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.count {
		flex-shrink: 0;
		font-size: 0.7rem;
		font-weight: 500;
		color: #6b7280;
		background: #e5e7eb;
		border-radius: 999px;
		padding: 0 0.35rem;
	}

	.delete-btn {
		color: #9ca3af;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.delete-btn:hover {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.07);
	}

	/* ── body ── */
	.list-body {
		padding: 0.35rem 0.75rem 0.75rem;
		display: flex;
		flex-direction: column;
	}

	.add-item-form {
		margin-top: 0.4rem;
	}

	.add-item-row {
		display: flex;
		gap: 0.35rem;
	}

	.add-item-btn {
		font-size: 1.1rem;
		padding: 0.2rem 0.5rem;
		font-weight: 600;
	}

	/* ── completed ── */
	.completed-toggle {
		margin-top: 0.5rem;
		font-size: 0.78rem;
		color: #9ca3af;
		align-self: flex-start;
		padding: 0.2rem 0.35rem;
	}

	.completed-list {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		border-top: 1px solid #f3f4f6;
		padding-top: 0.35rem;
	}

	.completed-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.15rem 0;
		cursor: pointer;
	}

	.item-checkbox {
		flex-shrink: 0;
		cursor: pointer;
		width: 15px;
		height: 15px;
	}

	.completed-text {
		font-size: 0.85rem;
		text-decoration: line-through;
		color: #9ca3af;
		line-height: 1.4;
	}
</style>
