<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { refreshOnSubmit } from '$lib/form-helpers.js';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListItemModal from '$lib/components/ListItemModal.svelte';

	let { data } = $props();

	let newTitle = $state('');
	let editingItem = $state(null);

	/**
	 * Which lists are collapsed is a per-browser preference rather than shared
	 * family state, so it lives in localStorage instead of the database.
	 */
	const COLLAPSE_KEY = 'lists_collapsed';
	let collapsed = $state({});

	// Read after mount so the server-rendered markup and the first client render
	// agree (localStorage doesn't exist during SSR).
	onMount(() => {
		try {
			collapsed = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}');
		} catch {
			collapsed = {};
		}
	});

	function persistCollapsed(next) {
		collapsed = next;
		localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
	}

	function toggleCollapse(listId) {
		persistCollapsed({ ...collapsed, [listId]: !collapsed[listId] });
	}

	function collapseAll() {
		persistCollapsed(Object.fromEntries(data.lists.map((l) => [l.id, true])));
	}

	function expandAll() {
		persistCollapsed({});
	}

	function openItem(item) {
		editingItem = item;
	}

	let expandedCount = $derived(data.lists.filter((l) => !collapsed[l.id]).length);
</script>

<div class="page-header">
	<h1 class="page-title">Lists</h1>
	<div class="header-bar">
		<form method="POST" action="?/create" use:enhance={refreshOnSubmit(() => (newTitle = ''))}>
			<div class="create-bar">
				<input class="input" type="text" name="title" placeholder="New list title..." bind:value={newTitle} />
				<button type="submit" class="btn btn-create" disabled={!newTitle.trim()}>Create List</button>
			</div>
		</form>

		{#if data.lists.length > 0}
			<div class="collapse-all">
				<button type="button" class="btn-ghost" onclick={collapseAll} disabled={expandedCount === 0}>Collapse all</button>
				<button type="button" class="btn-ghost" onclick={expandAll} disabled={expandedCount === data.lists.length}>Expand all</button>
			</div>
		{/if}
	</div>
</div>

<div class="lists-grid">
	{#each data.lists as list (list.id)}
		<ListCard {list} memberId={data.memberId} collapsed={!!collapsed[list.id]} onToggleCollapse={toggleCollapse} onEditItem={openItem} />
	{/each}
</div>

{#if data.lists.length === 0}
	<p class="empty-state">No lists yet — create one above.</p>
{/if}

{#if editingItem}
	<ListItemModal item={editingItem} lists={data.lists} family={data.family} onClose={() => (editingItem = null)} />
{/if}

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

	.header-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.create-bar {
		display: flex;
		gap: 0.5rem;
		max-width: 480px;
	}

	.collapse-all {
		display: flex;
		gap: 0.25rem;
	}

	.create-bar .input {
		flex: 1;
	}

	.btn-create {
		background: #374151;
		color: #fff;
		flex-shrink: 0;
	}

	.btn-create:hover:not(:disabled) {
		background: #1f2937;
	}

	/*
	 * Lists tile the page and flow onto new rows — the page scrolls down rather
	 * than sideways, and on narrow screens they stack into a single column.
	 */
	.lists-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		align-items: start;
		gap: 1rem;
		padding-bottom: 1rem;
	}

	@media (max-width: 640px) {
		.page-title {
			font-size: 1.25rem;
		}

		.lists-grid {
			grid-template-columns: 1fr;
		}

		.create-bar {
			max-width: 100%;
		}
	}
</style>
