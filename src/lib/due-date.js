/**
 * Natural-language due dates for list items.
 *
 * When someone types "Clean the gutter by Thursday" the time phrase is stripped
 * from the item text and turned into a due date:
 *
 *   parseDueDate('Clean the gutter by Thursday')
 *   → { text: 'Clean the gutter', dueDate: '2026-08-06', matched: 'by Thursday' }
 *
 * ── Scope ───────────────────────────────────────────────────────────────────
 * This is deliberately a small, conservative first pass — the intent is that
 * the grammar grows over time without anything else having to change. Callers
 * only ever see `{ text, dueDate, matched }`, so adding rules below is the only
 * thing needed to understand more phrasings (month/day dates, "in a fortnight",
 * "end of the month", times of day, …).
 *
 * Two safety rules keep it from mangling ordinary text:
 *   1. A bare weekday ("Thursday") is only treated as a date when it sits at
 *      the very end of the item — so "Buy Sunday roast" keeps its Sunday.
 *   2. Weekday abbreviations ("thurs") need a lead-in word ("by", "on", …) —
 *      so "where I sat" keeps its "sat".
 *
 * Dates are floating 'YYYY-MM-DD' strings (no time-of-day) and are resolved
 * against the caller's local "today".
 */

const DAY_INDEX = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
	sun: 0,
	mon: 1,
	tue: 2,
	tues: 2,
	wed: 3,
	weds: 3,
	thu: 4,
	thur: 4,
	thurs: 4,
	fri: 5,
	sat: 6
};

const FULL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ABBREVS = ['tues', 'thurs', 'weds', 'thur', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Words that may introduce a date phrase ("… by Thursday", "… due Friday"). */
const LEAD = '(?:by|on|due|before|after|this|next|for|until|til|till)';

/** Local-midnight copy of `date`, so day arithmetic never crosses a DST edge oddly. */
function atMidnight(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
	const d = atMidnight(date);
	d.setDate(d.getDate() + days);
	return d;
}

function addMonths(date, months) {
	const d = atMidnight(date);
	d.setMonth(d.getMonth() + months);
	return d;
}

/**
 * The next calendar occurrence of `targetDow`, today included.
 * `forceNext` ("next Thursday") only pushes a week out when today already is
 * that weekday — "next Thursday" said on a Monday still means this Thursday.
 */
function nextWeekday(today, targetDow, forceNext) {
	let delta = (targetDow - atMidnight(today).getDay() + 7) % 7;
	if (delta === 0 && forceNext) {
		delta = 7;
	}
	return addDays(today, delta);
}

/** Format a Date as a floating 'YYYY-MM-DD' string. */
export function toDateString(date) {
	const d = atMidnight(date);
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Rules are tried in order; the first one that matches wins.
 * `re` must match the entire phrase to remove as match[0].
 * `endAnchoredWithoutLeadIn` makes the rule ignore a match that neither has a
 * lead-in word (capture group 1) nor sits at the end of the string.
 */
const RULES = [
	// "in 3 days", "in 2 weeks"
	{
		re: /\bin\s+(\d{1,3})\s+(days?|weeks?)\b/i,
		resolve: (m, today) => addDays(today, Number(m[1]) * (/week/i.test(m[2]) ? 7 : 1))
	},

	// "next week", "next month"
	{
		re: /\bnext\s+(week|month)\b/i,
		resolve: (m, today) => (/week/i.test(m[1]) ? addDays(today, 7) : addMonths(today, 1))
	},

	// "today", "tonight", "tomorrow" — optionally introduced ("due tomorrow")
	{
		re: new RegExp(`\\b(?:${LEAD}\\s+)?(today|tonight|tomorrow|tmrw)\\b`, 'i'),
		resolve: (m, today) => (/^to(day|night)$/i.test(m[1]) ? atMidnight(today) : addDays(today, 1))
	},

	// Full weekday names: "by Thursday", or a trailing bare "Thursday".
	// The (?!['’]) guard keeps possessives like "Monday's party" intact.
	{
		re: new RegExp(`\\b(?:(${LEAD})\\s+)?(${FULL_DAYS.join('|')})\\b(?!['’])`, 'i'),
		endAnchoredWithoutLeadIn: true,
		resolve: (m, today) => nextWeekday(today, DAY_INDEX[m[2].toLowerCase()], /^next$/i.test(m[1] ?? ''))
	},

	// Abbreviated weekdays always need a lead-in: "by thurs", "on fri."
	{
		re: new RegExp(`\\b(${LEAD})\\s+(${ABBREVS.join('|')})\\b\\.?`, 'i'),
		resolve: (m, today) => nextWeekday(today, DAY_INDEX[m[2].toLowerCase()], /^next$/i.test(m[1]))
	}
];

/** Trailing whitespace/punctuation left behind once a phrase is cut out. */
function tidy(text) {
	return text
		.replace(/\s{2,}/g, ' ')
		.replace(/\s+([,.;:!?])/g, '$1')
		.replace(/[\s,;:-]+$/, '')
		.trim();
}

/** True when nothing but whitespace/punctuation follows `end` in `text`. */
function isAtEnd(text, end) {
	return /^[\s.,;:!?]*$/.test(text.slice(end));
}

/**
 * Pull a due date out of free-form item text.
 *
 * @param {string} input raw text the user typed
 * @param {{ today?: Date }} [options] `today` is injectable so tests are stable
 * @returns {{ text: string, dueDate: string | null, matched: string | null }}
 *   `text` with the date phrase removed (never empty — falls back to the
 *   original input), the resolved 'YYYY-MM-DD' date, and the phrase consumed.
 */
export function parseDueDate(input, { today = new Date() } = {}) {
	const raw = (input ?? '').toString();
	const none = { text: raw.trim(), dueDate: null, matched: null };
	if (!raw.trim()) {
		return none;
	}

	for (const rule of RULES) {
		const m = rule.re.exec(raw);
		if (!m) {
			continue;
		}
		if (rule.endAnchoredWithoutLeadIn && !m[1] && !isAtEnd(raw, m.index + m[0].length)) {
			continue;
		}

		const text = tidy(raw.slice(0, m.index) + ' ' + raw.slice(m.index + m[0].length));
		// A date phrase that swallowed the whole item ("tomorrow") isn't a task —
		// keep the original wording rather than leaving a blank item.
		if (!text) {
			return none;
		}
		return { text, dueDate: toDateString(rule.resolve(m, today)), matched: m[0].trim() };
	}

	return none;
}
