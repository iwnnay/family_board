import { describe, it, expect } from 'vitest';
import { COLORS, DEFAULT_HUE, getHue, buildCssVars, swatchBg } from '$lib/colors.js';

describe('COLORS', () => {
	it('has 16 entries', () => {
		expect(COLORS).toHaveLength(16);
	});

	it('each color has key, hue (0-360), and label', () => {
		for (const color of COLORS) {
			expect(typeof color.key).toBe('string');
			expect(color.key.length).toBeGreaterThan(0);
			expect(typeof color.label).toBe('string');
			expect(color.label.length).toBeGreaterThan(0);
			expect(typeof color.hue).toBe('number');
			expect(color.hue).toBeGreaterThanOrEqual(0);
			expect(color.hue).toBeLessThanOrEqual(360);
		}
	});
});

describe('DEFAULT_HUE', () => {
	it('is 215', () => {
		expect(DEFAULT_HUE).toBe(215);
	});
});

describe('getHue', () => {
	it("returns 212 for 'blue'", () => {
		expect(getHue('blue')).toBe(212);
	});

	it("returns 350 for 'rose'", () => {
		expect(getHue('rose')).toBe(350);
	});

	it('returns DEFAULT_HUE (215) for an unknown color key', () => {
		expect(getHue('unknown-color')).toBe(215);
	});

	it('returns DEFAULT_HUE (215) for null', () => {
		expect(getHue(null)).toBe(215);
	});

	it('returns DEFAULT_HUE (215) for undefined', () => {
		expect(getHue(undefined)).toBe(215);
	});
});

describe('swatchBg', () => {
	it('returns hsl string for the given hue', () => {
		expect(swatchBg(212)).toBe('hsl(212 65% 80%)');
	});
});

describe('buildCssVars', () => {
	it('includes --c-nav-bg with the given hue', () => {
		expect(buildCssVars(212)).toContain('--c-nav-bg: hsl(212 28% 18%)');
	});

	it('includes all 9 expected CSS var names', () => {
		const css = buildCssVars(212);
		const expectedVars = [
			'--c-nav-bg',
			'--c-nav-border',
			'--c-nav-link',
			'--c-nav-link-hover',
			'--c-nav-active-bg',
			'--c-member-bg',
			'--c-member-border',
			'--c-member-text',
			'--c-swatch'
		];
		for (const name of expectedVars) {
			expect(css).toContain(name);
		}
	});
});
