<script>
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { getHue } from '$lib/colors.js';

	let { data } = $props();

	let showMemberModal = $state(false);
	let pendingChoreId = $state(null);

	const FREQ_LABELS = {
		none: 'Once',
		daily: 'Daily',
		weekly: 'Weekly',
		monthly: 'Monthly',
		yearly: 'Yearly'
	};

	// Pastel bubble colors for each frequency badge
	const FREQ_BADGE = {
		none:    { bg: '#dbeafe', text: '#1d4ed8' },
		daily:   { bg: '#dcfce7', text: '#15803d' },
		weekly:  { bg: '#ffedd5', text: '#c2410c' },
		monthly: { bg: '#f3e8ff', text: '#7e22ce' },
		yearly:  { bg: '#fee2e2', text: '#b91c1c' },
	};

	async function submitAction(action, formData) {
		const response = await fetch(action, { method: 'POST', body: formData });
		const result = deserialize(await response.text());
		if (result.type === 'success' || result.type === 'redirect') {
			await invalidateAll();
		}
		applyAction(result);
	}

	async function handleChoreClick(chore) {
		if (chore.status === 'completed') return;

		if (!data.currentMember) {
			pendingChoreId = chore.id;
			showMemberModal = true;
			return;
		}

		const fd = new FormData();
		fd.set('chore_id', chore.id);
		await submitAction('?/complete', fd);
	}

	async function completeWithMember(memberId) {
		const fd = new FormData();
		fd.set('chore_id', pendingChoreId);
		fd.set('member_id', memberId);
		showMemberModal = false;
		pendingChoreId = null;
		await submitAction('?/complete', fd);
	}

	async function handleMemberChange(e) {
		const fd = new FormData();
		fd.set('member_id', e.target.value);
		await submitAction('?/selectMember', fd);
	}

	function completedStyle(chore) {
		const hue = getHue(chore.completed_by_color);
		return [
			`background: hsl(${hue} 60% 95%)`,
			`border-color: hsl(${hue} 45% 85%)`,
			`--done-text: hsl(${hue} 55% 38%)`,
		].join('; ');
	}

	let dueChores = $derived(data.chores.filter((c) => c.status === 'due'));
	let completedChores = $derived(data.chores.filter((c) => c.status === 'completed'));
</script>

<div class="page-header">
	<h1>Chores</h1>
	<select
		id="who-dis"
		class:unselected={!data.currentMember}
		class:selected={data.currentMember}
		onchange={handleMemberChange}
		aria-label="Who dis?"
	>
		<option value="">Who dis?</option>
		{#each data.family as member}
			<option value={member.id} selected={data.currentMember?.id === member.id}>
				{member.name}
			</option>
		{/each}
	</select>
</div>

{#if data.family.length === 0}
	<div class="empty-state">
		<p>Add family members in <a href="/manage-family">Manage Family</a> to get started.</p>
	</div>
{:else if data.chores.length === 0}
	<div class="empty-state">
		<p>No chores yet! Add some in <a href="/manage-chores">Manage Chores</a>.</p>
	</div>
{:else}
	{#if dueChores.length > 0}
		<div class="chore-grid">
			{#each dueChores as chore (chore.id)}
				<button class="chore-tile due" onclick={() => handleChoreClick(chore)}>
					{#if chore.image}
						<img src="/store/images/chores/{chore.image}" alt={chore.name} class="chore-img" />
					{/if}
					<span class="chore-name">{chore.name}</span>
					<span
						class="freq-bubble"
						style="background: {FREQ_BADGE[chore.frequency].bg}; color: {FREQ_BADGE[chore.frequency].text}"
					>
						{FREQ_LABELS[chore.frequency]}
					</span>
					{#if chore.suggested_day}
						<span class="chore-day">{chore.suggested_day}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	{#if completedChores.length > 0}
		<h2 class="section-label">Recently Completed</h2>
		<div class="chore-grid">
			{#each completedChores as chore (chore.id)}
				<div class="chore-tile completed" style={completedStyle(chore)}>
					{#if chore.image}
						<img src="/store/images/chores/{chore.image}" alt={chore.name} class="chore-img" />
					{/if}
					<span class="chore-name">{chore.name}</span>
					<span
						class="freq-bubble"
						style="background: {FREQ_BADGE[chore.frequency].bg}; color: {FREQ_BADGE[chore.frequency].text}; opacity: 0.6"
					>
						{FREQ_LABELS[chore.frequency]}
					</span>
					<span class="chore-done">✓ {chore.completed_by_name}</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

{#if showMemberModal}
	<div
		class="modal-overlay"
		role="dialog"
		aria-modal="true"
		onclick={() => { showMemberModal = false; pendingChoreId = null; }}
	>
		<div class="modal" onclick={(e) => e.stopPropagation()} role="presentation">
			<h2>Who are you?</h2>
			<p>Pick your name to log this chore.</p>
			<div class="member-list">
				{#each data.family as member}
					<button class="member-btn" onclick={() => completeWithMember(member.id)}>
						{member.name}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
	}

	#who-dis {
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: 2px solid;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	#who-dis.unselected {
		border-color: #fca5a5;
		background: #fef2f2;
		color: #dc2626;
	}

	#who-dis.selected {
		border-color: var(--c-member-border);
		background: var(--c-member-bg);
		color: var(--c-member-text);
	}

	.section-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #94a3b8;
		margin: 1.5rem 0 0.75rem;
	}

	.chore-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	/* Base tile */
	.chore-tile {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		border-radius: 10px;
		border: 1.5px solid;
		text-align: left;
		overflow: hidden;
	}

	/* Due — neutral gray */
	.chore-tile.due {
		background: #f8fafc;
		border-color: #e2e8f0;
		cursor: pointer;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.chore-tile.due:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.chore-tile.due:active {
		transform: translateY(0);
	}

	/* Completed — color comes from inline style */
	.chore-tile.completed {
		cursor: default;
	}

	.chore-img {
		width: calc(100% + 1.5rem);
		height: 110px;
		object-fit: cover;
		border-radius: 8px 8px 0 0;
		margin: -0.75rem -0.75rem 0.5rem;
	}

	.chore-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #374151;
		line-height: 1.3;
	}

	.chore-tile.completed .chore-name {
		color: var(--done-text);
	}

	.freq-bubble {
		display: inline-block;
		align-self: flex-start;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.45rem;
		border-radius: 99px;
	}

	.chore-day {
		font-size: 0.72rem;
		color: #94a3b8;
	}

	.chore-done {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--done-text);
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #94a3b8;
	}

	.empty-state a {
		color: #3b82f6;
		text-decoration: underline;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.modal {
		background: #fff;
		border-radius: 14px;
		padding: 2rem;
		max-width: 340px;
		width: 90%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.modal h2 {
		font-size: 1.4rem;
		margin-bottom: 0.35rem;
	}

	.modal p {
		color: #64748b;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.member-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-btn {
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, background 0.15s;
	}

	.member-btn:hover {
		border-color: #3b82f6;
		background: #eff6ff;
	}
</style>
