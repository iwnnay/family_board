<script>
	import { enhance } from '$app/forms';
	import { COLORS, swatchBg } from '$lib/colors.js';

	let { data, form } = $props();

	let selectedColor = $state(data.member?.color ?? 'blue');
</script>

<h1>My Settings</h1>

<!-- Profile -->
<section class="section-card">
	<h2>Profile</h2>

	{#if form?.profileSuccess}
		<div class="success">Profile updated.</div>
	{/if}
	{#if form?.profileError}
		<div class="error">{form.profileError}</div>
	{/if}

	<form method="POST" action="?/profile" use:enhance>
		<div class="field">
			<label for="name">Display Name</label>
			<input id="name" type="text" name="name" value={data.member?.name ?? ''} required />
		</div>

		<div class="field">
			<label>Color</label>
			<div class="swatches">
				{#each COLORS as color}
					<label class="swatch-wrap" title={color.label}>
						<input type="radio" name="color" value={color.key} checked={selectedColor === color.key} onchange={() => (selectedColor = color.key)} />
						<span class="swatch" style="background: {swatchBg(color.hue)}">
							{#if selectedColor === color.key}<span class="check">&#10003;</span>{/if}
						</span>
					</label>
				{/each}
			</div>
		</div>

		<button type="submit" class="btn-primary">Save</button>
	</form>
</section>

<!-- Change Password -->
<section class="section-card">
	<h2>Change Password</h2>

	{#if form?.passwordSuccess}
		<div class="success">Password changed.</div>
	{/if}
	{#if form?.passwordError}
		<div class="error">{form.passwordError}</div>
	{/if}

	<form method="POST" action="?/password" use:enhance>
		<div class="field">
			<label for="current_password">Current Password</label>
			<input id="current_password" type="password" name="current_password" autocomplete="current-password" required />
		</div>

		<div class="field">
			<label for="new_password">New Password</label>
			<input id="new_password" type="password" name="new_password" autocomplete="new-password" required />
			<span class="hint">At least 8 characters</span>
		</div>

		<div class="field">
			<label for="confirm_password">Confirm New Password</label>
			<input id="confirm_password" type="password" name="confirm_password" autocomplete="new-password" required />
		</div>

		<button type="submit" class="btn-primary">Change Password</button>
	</form>
</section>

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

	.section-card {
		background: #fff;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		margin-bottom: 1.5rem;
		max-width: 480px;
	}

	.error {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.success {
		background: #f0fdf4;
		color: #15803d;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	label {
		font-size: 0.85rem;
		font-weight: 500;
		color: #374151;
	}

	.hint {
		font-size: 0.78rem;
		color: #94a3b8;
	}

	input[type='text'],
	input[type='password'] {
		padding: 0.5rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		color: #1e293b;
	}

	input[type='text']:focus,
	input[type='password']:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 0.25rem;
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
		transition:
			transform 0.1s,
			border-color 0.1s;
		cursor: pointer;
		font-size: 0;
		padding: 0;
	}

	.swatch:hover,
	.swatch-wrap:hover .swatch {
		transform: scale(1.15);
		border-color: rgba(0, 0, 0, 0.2);
	}

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
		align-self: flex-start;
		padding: 0.5rem 1.25rem;
		background: #2563eb;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 1.35rem;
		}

		.section-card {
			padding: 1rem;
		}
	}
</style>
