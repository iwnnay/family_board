<script>
	import favicon from '$lib/assets/favicon.svg';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { getHue, buildCssVars } from '$lib/colors.js';

	let { children, data } = $props();

	let settingsOpen = $state(false);
	let drawerOpen = $state(false);

	let cssVars = $derived(buildCssVars(getHue(data.currentMember?.color)));
	let isAuthed = $derived(!!data.user);

	afterNavigate(() => {
		drawerOpen = false;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Family Board</title>
</svelte:head>

<div class="app" style={cssVars}>
	{#if isAuthed}
		<button class="hamburger" aria-label="Toggle menu" onclick={() => (drawerOpen = !drawerOpen)}>
			<span></span><span></span><span></span>
		</button>

		{#if drawerOpen}
			<div class="drawer-backdrop" role="presentation" onclick={() => (drawerOpen = false)}></div>
		{/if}

		<nav class="sidebar" class:open={drawerOpen}>
			<div class="nav-top">
				<div class="brand">🏠 Family Board</div>
				<ul>
					<li>
						<a href="/" class:active={page.url.pathname === '/'}>Main</a>
					</li>
					<li>
						<a href="/stats" class:active={page.url.pathname === '/stats'}>Stats</a>
					</li>
					<li>
						<a href="/notes" class:active={page.url.pathname === '/notes'}>Notes</a>
					</li>
					<li>
						<a href="/calendar" class:active={page.url.pathname === '/calendar'}>Calendar</a>
					</li>
					<li>
						<a href="/lists" class:active={page.url.pathname === '/lists'}>Lists</a>
					</li>
				</ul>
			</div>
			<div class="nav-bottom">
				<button class="settings-toggle" onclick={() => (settingsOpen = !settingsOpen)}>
					Settings {settingsOpen ? '▲' : '▼'}
				</button>
				{#if settingsOpen}
					<ul>
						<li>
							<a href="/settings" class:active={page.url.pathname === '/settings'}> My Settings </a>
						</li>
						<li>
							<a href="/manage-chores" class:active={page.url.pathname === '/manage-chores'}> Manage Chores </a>
						</li>
						{#if data.user?.is_admin}
							<li>
								<a href="/manage-users" class:active={page.url.pathname === '/manage-users'}> Manage Users </a>
							</li>
						{/if}
						<li>
							<a href="/manage-locations" class:active={page.url.pathname === '/manage-locations'}> Manage Locations </a>
						</li>
					</ul>
				{/if}
				<div class="nav-user">
					<span class="nav-username">{data.currentMember?.name ?? data.user.username}</span>
					<form method="POST" action="/logout" use:enhance>
						<button type="submit" class="logout-btn">Log out</button>
					</form>
				</div>
			</div>
		</nav>
	{/if}

	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #f3f4f6;
		color: #1f2937;
	}

	.app {
		display: flex;
		min-height: 100vh;
	}

	/* ── hamburger (hidden on desktop) ── */
	.hamburger {
		display: none;
		position: fixed;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 110;
		background: var(--c-nav-bg, #1e293b);
		border: none;
		border-radius: 8px;
		padding: 0.55rem 0.5rem;
		cursor: pointer;
		flex-direction: column;
		gap: 4px;
	}

	.hamburger span {
		display: block;
		width: 20px;
		height: 2.5px;
		background: var(--c-nav-link-hover, #fff);
		border-radius: 2px;
	}

	/* ── drawer backdrop (hidden on desktop) ── */
	.drawer-backdrop {
		display: none;
	}

	.sidebar {
		width: 200px;
		background: var(--c-nav-bg);
		color: var(--c-nav-link);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 1.5rem 0;
		flex-shrink: 0;
		transition: background 0.3s;
	}

	.brand {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--c-nav-link-hover);
		padding: 0 1.25rem 1.25rem;
		border-bottom: 1px solid var(--c-nav-border);
		margin-bottom: 1rem;
	}

	.nav-top ul,
	.nav-bottom ul {
		list-style: none;
	}

	.nav-top ul li a,
	.nav-bottom ul li a {
		display: block;
		padding: 0.6rem 1.25rem;
		color: var(--c-nav-link);
		text-decoration: none;
		font-size: 0.95rem;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.nav-top ul li a:hover,
	.nav-bottom ul li a:hover {
		background: var(--c-nav-border);
		color: var(--c-nav-link-hover);
	}

	.nav-top ul li a.active,
	.nav-bottom ul li a.active {
		background: var(--c-nav-active-bg);
		color: #fff;
	}

	.settings-toggle {
		width: 100%;
		background: none;
		border: none;
		border-top: 1px solid var(--c-nav-border);
		color: var(--c-nav-link);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.75rem 1.25rem;
		text-align: left;
		cursor: pointer;
		transition: color 0.15s;
	}

	.settings-toggle:hover {
		color: var(--c-nav-link-hover);
	}

	.nav-user {
		border-top: 1px solid var(--c-nav-border);
		padding: 0.75rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.nav-username {
		font-size: 0.8rem;
		color: var(--c-nav-link);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.logout-btn {
		background: none;
		border: none;
		color: var(--c-nav-link);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		transition:
			background 0.15s,
			color 0.15s;
		white-space: nowrap;
	}

	.logout-btn:hover {
		background: var(--c-nav-border);
		color: var(--c-nav-link-hover);
	}

	main {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}

	/* ── mobile breakpoint ── */
	@media (max-width: 640px) {
		.hamburger {
			display: flex;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			z-index: 100;
			transform: translateX(-100%);
			transition:
				transform 0.25s ease,
				background 0.3s;
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.drawer-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 90;
		}

		main {
			padding: 3.5rem 1rem 1rem;
		}
	}
</style>
