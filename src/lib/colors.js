export const COLORS = [
	{ key: 'rose',    hue: 350, label: 'Rose' },
	{ key: 'pink',    hue: 322, label: 'Pink' },
	{ key: 'fuchsia', hue: 293, label: 'Fuchsia' },
	{ key: 'purple',  hue: 270, label: 'Purple' },
	{ key: 'violet',  hue: 250, label: 'Violet' },
	{ key: 'indigo',  hue: 232, label: 'Indigo' },
	{ key: 'blue',    hue: 212, label: 'Blue' },
	{ key: 'sky',     hue: 197, label: 'Sky' },
	{ key: 'cyan',    hue: 182, label: 'Cyan' },
	{ key: 'teal',    hue: 166, label: 'Teal' },
	{ key: 'emerald', hue: 150, label: 'Emerald' },
	{ key: 'green',   hue: 130, label: 'Green' },
	{ key: 'lime',    hue: 82,  label: 'Lime' },
	{ key: 'yellow',  hue: 54,  label: 'Yellow' },
	{ key: 'amber',   hue: 36,  label: 'Amber' },
	{ key: 'orange',  hue: 18,  label: 'Orange' },
];

export const DEFAULT_HUE = 215;

export function getHue(colorKey) {
	return COLORS.find((c) => c.key === colorKey)?.hue ?? DEFAULT_HUE;
}

/** Returns an inline style string setting all theme CSS vars from a hue value. */
export function buildCssVars(hue) {
	return [
		// Nav
		`--c-nav-bg: hsl(${hue} 28% 18%)`,
		`--c-nav-border: hsl(${hue} 22% 26%)`,
		`--c-nav-link: hsl(${hue} 18% 62%)`,
		`--c-nav-link-hover: hsl(${hue} 25% 84%)`,
		`--c-nav-active-bg: hsl(${hue} 55% 46%)`,
		// Member accent (Who dis?, name color, etc.)
		`--c-member-bg: hsl(${hue} 72% 93%)`,
		`--c-member-border: hsl(${hue} 55% 72%)`,
		`--c-member-text: hsl(${hue} 60% 28%)`,
		// Swatch pastel preview (used on manage-family page)
		`--c-swatch: hsl(${hue} 65% 80%)`,
	].join('; ');
}

/** Pastel swatch background for a given hue — used to render the colour circles. */
export function swatchBg(hue) {
	return `hsl(${hue} 65% 80%)`;
}
