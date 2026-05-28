<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';
	import { fmtDate } from '$lib/format.js';

	let { data, form } = $props();

	let copied = $state(false);

	async function copyInviteLink() {
		const url = `${page.url.origin}/invite?code=${form.newInviteCode}`;
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(url);
			} else if (navigator.share) {
				await navigator.share({ title: 'Family Board Invite', url });
			} else {
				window.prompt('Copy this link:', url);
				return;
			}
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			window.prompt('Copy this link:', url);
		}
	}
</script>

<h1 class="page-title-lg">Manage Users</h1>

<section class="section-card">
	<h2 class="section-heading">Invite Codes</h2>

	<form method="POST" action="?/createInvite" use:enhance>
		<button type="submit" class="btn btn-blue">Generate Invite</button>
	</form>

	{#if form?.newInviteCode}
		<button class="invite-result" onclick={copyInviteLink}>
			<p class="invite-label">{copied ? 'Copied!' : 'Click to copy invite link'}</p>
			<code class="invite-url">{page.url.origin}/invite?code={form.newInviteCode}</code>
		</button>
	{/if}

	{#if data.invites.length > 0}
		<div class="invite-list">
			{#each data.invites as invite (invite.id)}
				<div class="invite-row">
					<code class="invite-code">{invite.code}</code>
					<span class="invite-expires">Expires {fmtDate(invite.expires_at)}</span>
				</div>
			{/each}
		</div>
	{:else if !form?.newInviteCode}
		<p class="empty">No active invite codes.</p>
	{/if}
</section>

<section class="section-card">
	<h2 class="section-heading">Users ({data.users.length})</h2>

	<FeedbackMessage error={form?.error ?? ''} success={form?.resetSuccess ? 'Password reset successfully. User has been logged out.' : form?.deleteSuccess ? 'User deleted.' : ''} />

	{#each data.users as user (user.id)}
		<div class="user-row">
			<div class="user-info">
				<span class="user-name">{user.username}</span>
				{#if user.is_admin}
					<span class="admin-badge">Admin</span>
				{/if}
				<span class="user-date">Joined {fmtDate(user.created_at)}</span>
			</div>

			{#if !user.is_admin}
				<div class="user-actions">
					<form method="POST" action="?/resetPassword" use:enhance class="reset-form">
						<input type="hidden" name="user_id" value={user.id} />
						<input type="password" name="new_password" placeholder="New password" class="input input-sm reset-input" autocomplete="new-password" />
						<button type="submit" class="btn-reset">Reset</button>
					</form>
					<form
						method="POST"
						action="?/deleteUser"
						use:enhance
						onsubmit={(e) => {
							if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) {e.preventDefault();}
						}}
					>
						<input type="hidden" name="user_id" value={user.id} />
						<button type="submit" class="btn-delete">Delete</button>
					</form>
				</div>
			{/if}
		</div>
	{/each}
</section>

<style>
	.invite-result {
		display: block;
		width: 100%;
		margin-top: 1rem;
		padding: 0.75rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}

	.invite-result:hover {
		background: #dbeafe;
	}

	.invite-label {
		font-size: 0.82rem;
		color: #374151;
		font-weight: 500;
		margin-bottom: 0.35rem;
	}

	.invite-url {
		display: block;
		font-size: 0.85rem;
		word-break: break-all;
		color: #1d4ed8;
		background: #fff;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		border: 1px solid #dbeafe;
	}

	.invite-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.invite-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.invite-code {
		font-size: 0.9rem;
		font-weight: 600;
		color: #1f2937;
	}

	.invite-expires {
		font-size: 0.78rem;
		color: #6b7280;
	}

	.empty {
		color: #94a3b8;
		font-style: italic;
		margin-top: 0.75rem;
	}

	.user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		gap: 0.75rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.user-name {
		font-weight: 600;
		color: #1f2937;
	}

	.admin-badge {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.1rem 0.4rem;
		border-radius: 99px;
		background: #dbeafe;
		color: #1d4ed8;
	}

	.user-date {
		font-size: 0.78rem;
		color: #6b7280;
	}

	.user-actions {
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
		align-items: center;
	}

	.reset-form {
		display: flex;
		gap: 0.35rem;
	}

	.reset-input {
		width: 140px;
	}

	@media (max-width: 640px) {
		.user-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.user-actions {
			width: 100%;
			flex-wrap: wrap;
		}

		.reset-form {
			flex: 1;
		}

		.reset-input {
			flex: 1;
			width: auto;
		}
	}
</style>
