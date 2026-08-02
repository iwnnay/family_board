<script>
	import { enhance } from '$app/forms';
	import { refreshOnSubmit } from '$lib/form-helpers.js';
	import { memberChipStyle } from '$lib/color-styles.js';
	import { dueLabel, dueTone, priorityLabel } from '$lib/list-items.js';

	/**
	 * One active list item: checkbox, title, at-a-glance chips, and an
	 * expandable area for the photo, notes and steps.
	 */
	let { item, onEdit } = $props();

	let expanded = $state(false);

	let steps = $derived(item.steps ?? []);
	let doneSteps = $derived(steps.filter((s) => s.completed_at).length);
	let hasDetail = $derived(steps.length > 0 || !!item.notes || !!item.image);
	let tone = $derived(dueTone(item.due_date));
</script>

<div class="item">
	<div class="item-main">
		<form method="POST" action="?/checkItem" use:enhance={refreshOnSubmit()} class="check-form">
			<input type="hidden" name="item_id" value={item.id} />
			<input type="checkbox" class="item-checkbox" aria-label="Complete {item.item}" onchange={(e) => e.currentTarget.form.requestSubmit()} />
		</form>

		<button type="button" class="item-text" onclick={() => onEdit?.(item)} title="Edit item">
			{item.item}
		</button>

		<div class="item-tools">
			{#if hasDetail}
				<button type="button" class="btn-ghost caret" aria-expanded={expanded} title={expanded ? 'Hide details' : 'Show details'} onclick={() => (expanded = !expanded)}>
					{expanded ? '▴' : '▾'}
				</button>
			{/if}
			<button type="button" class="btn-ghost edit-btn" title="Edit item" onclick={() => onEdit?.(item)}>✏️</button>
		</div>
	</div>

	{#if item.due_date || item.priority !== 'none' || item.assignee || steps.length > 0 || item.notes || item.image}
		<div class="chips">
			{#if item.due_date}
				<span class="chip chip-due chip-{tone}" title="Due {item.due_date}">📅 {dueLabel(item.due_date)}</span>
			{/if}
			{#if item.priority !== 'none'}
				<span class="chip chip-priority chip-p-{item.priority}">{priorityLabel(item.priority)}</span>
			{/if}
			{#if item.assignee}
				<span class="chip chip-member" style={memberChipStyle(item.assignee)}>{item.assignee.name}</span>
			{/if}
			{#if steps.length > 0}
				<span class="chip">☑ {doneSteps}/{steps.length}</span>
			{/if}
			{#if item.notes}
				<span class="chip" title="Has notes">📝</span>
			{/if}
			{#if item.image}
				<span class="chip" title="Has a photo">📎</span>
			{/if}
		</div>
	{/if}

	{#if expanded}
		<div class="detail">
			{#if item.image}
				<!-- rel="external" — a stored file, not an app route -->
				<a href="/store/images/lists/{item.image}" target="_blank" rel="external noreferrer" class="photo-link">
					<img src="/store/images/lists/{item.image}" alt={item.item} class="photo" />
				</a>
			{/if}

			{#if item.notes}
				<p class="notes">{item.notes}</p>
			{/if}

			{#if steps.length > 0}
				<ul class="steps">
					{#each steps as step (step.id)}
						<li>
							<form method="POST" action="?/toggleStep" use:enhance={refreshOnSubmit()}>
								<input type="hidden" name="step_id" value={step.id} />
								<label class="step">
									<input type="checkbox" checked={!!step.completed_at} onchange={(e) => e.currentTarget.form.requestSubmit()} />
									<span class:done={step.completed_at}>{step.step}</span>
								</label>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.item {
		padding: 0.3rem 0;
		border-bottom: 1px solid #f6f7f8;
	}

	.item-main {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.check-form {
		display: flex;
		padding-top: 2px;
	}

	.item-checkbox {
		flex-shrink: 0;
		cursor: pointer;
		width: 15px;
		height: 15px;
	}

	.item-text {
		flex: 1;
		text-align: left;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-size: 0.88rem;
		color: #374151;
		line-height: 1.4;
		cursor: pointer;
		word-break: break-word;
	}

	.item-text:hover {
		color: #111827;
		text-decoration: underline;
		text-decoration-style: dotted;
	}

	.item-tools {
		display: flex;
		flex-shrink: 0;
		gap: 0;
		opacity: 0;
		transition: opacity 0.12s;
	}

	.item:hover .item-tools,
	.item:focus-within .item-tools {
		opacity: 1;
	}

	.caret,
	.edit-btn {
		padding: 0 0.25rem;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	/* ── chips ── */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin: 0.2rem 0 0.1rem 1.45rem;
	}

	.chip {
		font-size: 0.68rem;
		line-height: 1.5;
		padding: 0 0.35rem;
		border-radius: 999px;
		border: 1px solid #e5e7eb;
		background: #f9fafb;
		color: #6b7280;
		white-space: nowrap;
	}

	.chip-overdue {
		background: #fef2f2;
		border-color: #fecaca;
		color: #b91c1c;
		font-weight: 600;
	}

	.chip-today {
		background: #fff7ed;
		border-color: #fed7aa;
		color: #c2410c;
		font-weight: 600;
	}

	.chip-soon {
		background: #fefce8;
		border-color: #fde68a;
		color: #a16207;
	}

	.chip-p-high {
		background: #fef2f2;
		border-color: #fecaca;
		color: #b91c1c;
	}

	.chip-p-medium {
		background: #fff7ed;
		border-color: #fed7aa;
		color: #c2410c;
	}

	.chip-p-low {
		background: #f0f9ff;
		border-color: #bae6fd;
		color: #0369a1;
	}

	/* ── expanded detail ── */
	.detail {
		margin: 0.35rem 0 0.4rem 1.45rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.photo-link {
		align-self: flex-start;
	}

	.photo {
		max-width: 100%;
		max-height: 160px;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
		display: block;
	}

	.notes {
		font-size: 0.8rem;
		color: #6b7280;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.steps {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #4b5563;
		cursor: pointer;
	}

	.step input {
		width: 13px;
		height: 13px;
		cursor: pointer;
	}

	.step .done {
		text-decoration: line-through;
		color: #9ca3af;
	}
</style>
