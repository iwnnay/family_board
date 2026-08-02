import { getHue } from './colors.js';

/** Background + border for a note card based on the note's color key. */
export function noteCardStyle(note) {
	if (!note?.color) {
		return '';
	}
	const hue = getHue(note.color);
	return `background: hsl(${hue} 60% 95%); border-color: hsl(${hue} 45% 72%);`;
}

/** Header background for a note card. */
export function noteHeaderStyle(note) {
	if (!note?.color) {
		return '';
	}
	const hue = getHue(note.color);
	return `background: hsl(${hue} 50% 88%);`;
}

/** Small filled circle style for a color key (used as a color indicator). */
export function colorDotStyle(colorKey) {
	if (!colorKey) {
		return 'background: #e5e7eb; border-color: #d1d5db;';
	}
	const hue = getHue(colorKey);
	return `background: hsl(${hue} 65% 80%); border-color: hsl(${hue} 45% 60%);`;
}

/** Swatch background + border for a color key (used in the color picker grid). */
export function swatchStyle(colorKey) {
	const hue = getHue(colorKey);
	return `background: hsl(${hue} 65% 80%); border-color: hsl(${hue} 45% 60%);`;
}

/** Pill style (background/border/text) tinted to a family member's colour. */
export function memberChipStyle(member) {
	const hue = getHue(member?.color);
	return `background: hsl(${hue} 70% 94%); border-color: hsl(${hue} 45% 78%); color: hsl(${hue} 55% 30%);`;
}

/** Completed-chore tile style (background, border, --done-text CSS var). */
export function completedStyle(chore) {
	const hue = getHue(chore?.completed_by_color);
	return [`background: hsl(${hue} 60% 95%)`, `border-color: hsl(${hue} 45% 85%)`, `--done-text: hsl(${hue} 55% 38%)`].join('; ');
}
