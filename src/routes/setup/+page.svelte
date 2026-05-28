<script>
	import { enhance } from '$app/forms';
	import { COLORS, swatchBg } from '$lib/colors.js';

	let { form } = $props();

	let selectedColor = $state('blue');
</script>

<div class="setup-page">
	<div class="setup-card">
		<h1>Welcome to Family Board</h1>
		<p class="subtitle">Create your admin account to get started.</p>

		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<form method="POST" use:enhance>
			<label class="field">
				<span class="label">Username</span>
				<input type="text" name="username" autocomplete="username" value={form?.username ?? ''} required />
			</label>

			<label class="field">
				<span class="label">Password</span>
				<input type="password" name="password" autocomplete="new-password" required />
				<span class="hint">At least 8 characters</span>
			</label>

			<label class="field">
				<span class="label">Confirm Password</span>
				<input type="password" name="confirm_password" autocomplete="new-password" required />
			</label>

			<label class="field">
				<span class="label">Display Name</span>
				<input type="text" name="display_name" placeholder="Your name shown in the app" value={form?.displayName ?? ''} required />
			</label>

			<div class="field">
				<span class="label">Color</span>
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

			<button type="submit" class="btn-primary">Create Account</button>
		</form>
	</div>
</div>

<style>
	.setup-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: #f3f4f6;
		padding: 1rem;
	}

	.setup-card {
		background: #fff;
		border-radius: 12px;
		padding: 2.5rem 2rem;
		width: 100%;
		max-width: 440px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
	}

	h1 {
		font-size: 1.6rem;
		font-weight: 700;
		color: #1e293b;
		text-align: center;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		text-align: center;
		color: #64748b;
		font-size: 0.9rem;
		margin-bottom: 1.75rem;
	}

	.error {
		background: #fef2f2;
		color: #dc2626;
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

	.label {
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
		padding: 0.55rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		color: #1e293b;
		width: 100%;
	}

	input[type='text']:focus,
	input[type='password']:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	/* Swatches — matches manage-family pattern */
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
		margin-top: 0.5rem;
		padding: 0.65rem 1.25rem;
		background: #2563eb;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	@media (max-width: 640px) {
		.setup-card {
			padding: 2rem 1.25rem;
		}

		h1 {
			font-size: 1.35rem;
		}
	}
</style>
