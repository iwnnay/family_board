<script>
	import { enhance } from '$app/forms';
	import { COLORS, swatchBg } from '$lib/colors.js';

	let { data, form } = $props();

	let newColor = $state('blue');
</script>

<h1>Manage Family</h1>

<div class="form-card">
	<h2>Add Family Member</h2>

	{#if form?.error}
		<div class="error">{form.error}</div>
	{/if}

	<form method="POST" action="?/add" use:enhance>
		<div class="inline-field">
			<input name="name" type="text" placeholder="Name" required />
			<button type="submit" class="btn-primary">Add</button>
		</div>

		<div class="color-row">
			<span class="color-label">Color</span>
			<div class="swatches">
				{#each COLORS as color}
					<label class="swatch-wrap" title={color.label}>
						<input
							type="radio"
							name="color"
							value={color.key}
							checked={newColor === color.key}
							onchange={() => (newColor = color.key)}
						/>
						<span class="swatch" style="background: {swatchBg(color.hue)}">
							{#if newColor === color.key}<span class="check">✓</span>{/if}
						</span>
					</label>
				{/each}
			</div>
		</div>
	</form>
</div>

<div class="family-list">
	<h2>Family Members ({data.family.length})</h2>

	{#if data.family.length === 0}
		<p class="empty">No family members yet. Add someone above!</p>
	{:else}
		{#each data.family as member (member.id)}
			<div class="member-card">
				<div class="member-header">
					<span class="member-name">{member.name}</span>
					<form
						method="POST"
						action="?/delete"
						use:enhance
						onsubmit={(e) => {
							if (!confirm(`Remove "${member.name}"?`)) e.preventDefault();
						}}
					>
						<input type="hidden" name="id" value={member.id} />
						<button type="submit" class="btn-delete">Remove</button>
					</form>
				</div>

				<form method="POST" action="?/setColor" use:enhance>
					<input type="hidden" name="id" value={member.id} />
					<div class="swatches">
						{#each COLORS as color}
							<button
								type="submit"
								name="color"
								value={color.key}
								class="swatch"
								class:active={member.color === color.key}
								style="background: {swatchBg(color.hue)}"
								title={color.label}
							>
								{#if member.color === color.key}<span class="check">✓</span>{/if}
							</button>
						{/each}
					</div>
				</form>
			</div>
		{/each}
	{/if}
</div>

<style>
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 1rem;
	}

	.form-card {
		background: #fff;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		margin-bottom: 2rem;
		max-width: 480px;
	}

	.inline-field {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	input[type='text'] {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		color: #1e293b;
	}

	input[type='text']:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.color-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: #374151;
		white-space: nowrap;
	}

	/* Swatches shared between add form (radio) and member rows (buttons) */
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.swatch-wrap input[type='radio'] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.swatch-wrap {
		cursor: pointer;
	}

	.swatch {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid transparent;
		transition: transform 0.1s, border-color 0.1s;
		cursor: pointer;
		font-size: 0;
		padding: 0;
	}

	.swatch:hover,
	.swatch-wrap:hover .swatch {
		transform: scale(1.15);
		border-color: rgba(0, 0, 0, 0.2);
	}

	.swatch.active,
	.swatch-wrap input:checked + .swatch {
		border-color: rgba(0, 0, 0, 0.35);
		transform: scale(1.15);
	}

	.check {
		font-size: 0.7rem;
		color: rgba(0, 0, 0, 0.5);
		font-weight: 700;
		line-height: 1;
	}

	.btn-primary {
		padding: 0.5rem 1.25rem;
		background: #2563eb;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	.error {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	/* Member cards */
	.family-list {
		max-width: 480px;
	}

	.member-card {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 0.9rem 1rem;
		margin-bottom: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.member-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.member-name {
		font-weight: 600;
		font-size: 1rem;
		color: #1e293b;
	}

	.btn-delete {
		padding: 0.3rem 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: pointer;
		color: #dc2626;
	}

	.btn-delete:hover {
		background: #fee2e2;
	}

	.empty {
		color: #94a3b8;
		font-style: italic;
	}
</style>
