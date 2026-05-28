import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5789,
		strictPort: true
	},
	preview: {
		port: 5789,
		strictPort: true
	},
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		expect: { requireAssertions: true }
	}
});
