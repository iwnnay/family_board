<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { getHue, buildCssVars } from '$lib/colors.js';

	let { children, data } = $props();

	let settingsOpen = $state(false);

	let cssVars = $derived(buildCssVars(getHue(data.currentMember?.color)));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Family Board</title>
</svelte:head>

<div class="app" style={cssVars}>
	<nav class="sidebar">
		<div class="nav-top">
			<div class="brand">🏠 Family Board</div>
			<ul>
				<li>
					<a href="/" class:active={page.url.pathname === '/'}>Main</a>
				</li>
				<li>
					<a href="/stats" class:active={page.url.pathname === '/stats'}>Stats</a>
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
						<a href="/manage-chores" class:active={page.url.pathname === '/manage-chores'}>
							Manage Chores
						</a>
					</li>
					<li>
						<a href="/manage-family" class:active={page.url.pathname === '/manage-family'}>
							Manage Family
						</a>
					</li>
				</ul>
			{/if}
		</div>
	</nav>

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
		transition: background 0.15s, color 0.15s;
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

	main {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}
</style>
