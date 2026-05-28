import { describe, it, expect } from 'vitest';
import { noteCardStyle, noteHeaderStyle, colorDotStyle, swatchStyle, completedStyle } from '$lib/color-styles.js';

describe('noteCardStyle', () => {
	it('returns background and border-color hsl when note has a color', () => {
		const css = noteCardStyle({ color: 'blue' });
		expect(css).toContain('background: hsl(');
		expect(css).toContain('border-color: hsl(');
	});

	it('returns empty string for note without color', () => {
		expect(noteCardStyle({})).toBe('');
	});

	it('returns empty string for null', () => {
		expect(noteCardStyle(null)).toBe('');
	});
});

describe('noteHeaderStyle', () => {
	it('returns background hsl when note has a color', () => {
		const css = noteHeaderStyle({ color: 'blue' });
		expect(css).toContain('background: hsl(');
	});

	it('returns empty string for note without color', () => {
		expect(noteHeaderStyle({})).toBe('');
	});

	it('returns empty string for null', () => {
		expect(noteHeaderStyle(null)).toBe('');
	});
});

describe('colorDotStyle', () => {
	it('returns gray fallback for null', () => {
		expect(colorDotStyle(null)).toBe('background: #e5e7eb; border-color: #d1d5db;');
	});

	it('returns hsl for a known color key', () => {
		const css = colorDotStyle('blue');
		expect(css).toContain('hsl(');
		expect(css).toContain('background: hsl(');
		expect(css).toContain('border-color: hsl(');
	});
});

describe('swatchStyle', () => {
	it('returns background and border-color hsl for a known color key', () => {
		const css = swatchStyle('blue');
		expect(css).toContain('background: hsl(');
		expect(css).toContain('border-color: hsl(');
	});

	it('always returns hsl even for null (falls back to default hue)', () => {
		const css = swatchStyle(null);
		expect(css).toContain('hsl(');
	});
});

describe('completedStyle', () => {
	it("includes '--done-text:' CSS var when chore has completed_by_color", () => {
		const css = completedStyle({ completed_by_color: 'blue' });
		expect(css).toContain('--done-text:');
	});

	it('includes background and border-color', () => {
		const css = completedStyle({ completed_by_color: 'blue' });
		expect(css).toContain('background: hsl(');
		expect(css).toContain('border-color: hsl(');
	});

	it('falls back gracefully for chore without completed_by_color', () => {
		const css = completedStyle({});
		expect(css).toContain('--done-text:');
		expect(css).toContain('hsl(');
	});
});
