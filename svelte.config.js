import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-node outputs to ./build for a standalone Node server.
		adapter: adapter({ out: 'build' }),
		csrf: {
			trustedOrigins: []
		}
	}
};

export default config;
