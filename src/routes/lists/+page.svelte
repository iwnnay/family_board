<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let newTitle = $state('');
	let addItemText = $state({});
	let showCompleted = $state({});

	function toggleCompleted(listId) {
		showCompleted[listId] = !showCompleted[listId];
	}
</script>

<div class="page-header">
	<h1 class="page-title">Lists</h1>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				await invalidateAll();
				newTitle = '';
			};
		}}
	>
		<div class="create-bar">
			<input class="input" type="text" name="title" placeholder="New list title..." bind:value={newTitle} />
			<button type="submit" class="btn btn-create" disabled={!newTitle.trim()}>Create List</button>
		</div>
	</form>
</div>

<div class="lists-container">
	{#each data.lists as list (list.id)}
		<div class="list-card">
			<div class="list-header">
				<h2 class="list-title">{list.title}</h2>
				{#if list.created_by !== null && list.created_by === data.memberId}
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								await invalidateAll();
							};
						}}
					>
						<input type="hidden" name="id" value={list.id} />
						<button
							type="submit"
							class="btn-ghost delete-btn"
							title="Delete list"
							onclick={(e) => {
								if (!confirm('Delete this list and all its items?')) {
									e.preventDefault();
								}
							}}>✕</button
						>
					</form>
				{/if}
			</div>

			<div class="list-body">
				<!-- Active items -->
				{#each list.active_items as item (item.id)}
					<form
						method="POST"
						action="?/checkItem"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								await invalidateAll();
							};
						}}
					>
						<input type="hidden" name="item_id" value={item.id} />
						<label class="item-row">
							<input type="checkbox" class="item-checkbox" onchange={(e) => e.currentTarget.form.submit()} />
							<span class="item-text">{item.item}</span>
						</label>
					</form>
				{/each}

				<!-- Add item form -->
				<form
					method="POST"
					action="?/addItem"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
							addItemText[list.id] = '';
						};
					}}
				>
					<input type="hidden" name="list_id" value={list.id} />
					<div class="add-item-row">
						<input class="input input-sm" type="text" name="item" placeholder="Add item..." bind:value={addItemText[list.id]} />
						<button type="submit" class="btn-ghost add-item-btn" disabled={!addItemText[list.id]?.trim()}>+</button>
					</div>
				</form>

				<!-- Completed items -->
				{#if list.completed_items.length > 0}
					<button class="btn-ghost completed-toggle" onclick={() => toggleCompleted(list.id)}>
						{showCompleted[list.id] ? '▲' : '▼'}
						{list.completed_items.length} completed
					</button>
					{#if showCompleted[list.id]}
						<div class="completed-list">
							{#each list.completed_items as item (item.id)}
								<form
									method="POST"
									action="?/restoreItem"
									use:enhance={() => {
										return async ({ update }) => {
											await update();
											await invalidateAll();
										};
									}}
								>
									<input type="hidden" name="item_id" value={item.id} />
									<div class="item-row completed-item">
										<span class="item-text completed-text">{item.item}</span>
										<button type="submit" class="btn-ghost restore-btn" title="Restore item">↩</button>
									</div>
								</form>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.page-header {
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.create-bar {
		display: flex;
		gap: 0.5rem;
		max-width: 480px;
	}

	.input {
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		font-size: 0.9rem;
		flex: 1;
	}

	.input:focus {
		outline: 2px solid #6b7280;
		outline-offset: 1px;
	}

	.input-sm {
		font-size: 0.82rem;
		padding: 0.3rem 0.5rem;
	}

	.btn {
		padding: 0.45rem 1.1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.btn-create {
		background: #374151;
		color: #fff;
		flex-shrink: 0;
	}

	.btn-create:hover:not(:disabled) {
		background: #1f2937;
	}

	.btn-create:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-ghost {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.82rem;
		color: #6b7280;
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
	}

	.btn-ghost:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.06);
		color: #374151;
	}

	.btn-ghost:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* ── lists container ── */
	.lists-container {
		display: flex;
		flex-wrap: nowrap;
		gap: 1rem;
		overflow-x: auto;
		padding-bottom: 1rem;
		align-items: flex-start;
	}

	/* ── list card ── */
	.list-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		width: 300px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.75rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.list-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1f2937;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	/* ── list body ── */
	.list-body {
		padding: 0.5rem 0.75rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 480px;
		overflow-y: auto;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		cursor: pointer;
	}

	.item-checkbox {
		flex-shrink: 0;
		cursor: pointer;
		width: 15px;
		height: 15px;
	}

	.item-text {
		font-size: 0.88rem;
		color: #374151;
		line-height: 1.4;
	}

	/* ── add item ── */
	.add-item-row {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.35rem;
	}

	.add-item-btn {
		font-size: 1.1rem;
		padding: 0.2rem 0.5rem;
		font-weight: 600;
	}

	/* ── completed items ── */
	.completed-toggle {
		margin-top: 0.35rem;
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
		margin-top: 0.1rem;
	}

	.completed-item {
		justify-content: space-between;
		cursor: default;
	}

	.completed-text {
		text-decoration: line-through;
		color: #9ca3af;
	}

	.restore-btn {
		flex-shrink: 0;
		font-size: 0.9rem;
		padding: 0.15rem 0.4rem;
	}

	@media (max-width: 640px) {
		.page-title {
			font-size: 1.25rem;
		}

		.lists-container {
			flex-direction: column;
			flex-wrap: wrap;
		}

		.list-card {
			width: 100%;
		}

		.create-bar {
			max-width: 100%;
		}
	}
</style>
