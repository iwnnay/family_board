<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="login-page">
	<div class="login-card">
		<h1>Family Board</h1>
		<p class="subtitle">Sign in to continue</p>

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
				<input type="password" name="password" autocomplete="current-password" required />
			</label>

			<button type="submit" class="btn-primary">Sign In</button>
		</form>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: #f3f4f6;
		padding: 1rem;
	}

	.login-card {
		background: #fff;
		border-radius: 12px;
		padding: 2.5rem 2rem;
		width: 100%;
		max-width: 380px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
	}

	h1 {
		font-size: 1.75rem;
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
		.login-card {
			padding: 2rem 1.25rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
