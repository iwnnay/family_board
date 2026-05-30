import { eq, and, gte, lte, asc, desc, ne } from 'drizzle-orm';
import { calendar_entries, locations, recent_events, family } from '../schema/index.js';
import { toUtcString, parseUtc } from '$lib/time.js';
import { normalizeRecurrence, generateOccurrences } from '$lib/recurrence.js';

// How far ahead recurring series are materialised, and re-extended ("healed").
const HORIZON_DAYS = 730;

// Columns selected for every calendar-entry read (kept in one place so the
// list and by-id queries stay in sync).
const entryColumns = {
	id: calendar_entries.id,
	title: calendar_entries.title,
	start_time: calendar_entries.start_time,
	end_time: calendar_entries.end_time,
	description: calendar_entries.description,
	all_day: calendar_entries.all_day,
	series_id: calendar_entries.series_id,
	recurrence: calendar_entries.recurrence,
	recurrence_end: calendar_entries.recurrence_end,
	created_by: calendar_entries.created_by,
	created_by_color: family.color,
	location_id: calendar_entries.location_id,
	location_name: locations.name,
	location_address: locations.address
};

/** The start_time through which series should currently be materialised. */
function horizonString() {
	const d = new Date();
	d.setDate(d.getDate() + HORIZON_DAYS);
	return toUtcString(d);
}

/** The date ('YYYY-MM-DD') immediately before the given timestamp's date. */
function dayBefore(ts) {
	const d = parseUtc(`${ts.slice(0, 10)} 00:00:00`);
	d.setUTCDate(d.getUTCDate() - 1);
	return toUtcString(d).slice(0, 10);
}

/** Builds an occurrence row's column values from event fields + per-row state. */
function occurrenceRow(fields, { start_time, end_time }, { series_id, is_series_head, recurrence, recurrence_end, generated_until }) {
	return {
		title: fields.title,
		location_id: fields.location_id || null,
		start_time,
		end_time,
		description: fields.description || null,
		created_by: fields.created_by || null,
		all_day: fields.all_day ? 1 : 0,
		series_id: series_id ?? null,
		is_series_head: is_series_head ? 1 : 0,
		recurrence,
		recurrence_end: recurrence_end || null,
		generated_until: generated_until || null
	};
}

function nowStr() {
	return toUtcString();
}

function fmtStartTime(startStr) {
	const d = parseUtc(startStr);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

async function addEvent(db, { rel_id, action, title, start_time }) {
	const message = `${title} at ${fmtStartTime(start_time)}`;
	await db.insert(recent_events).values({ type: 'calendar', message, rel_id, rel_type: 'Cal Event', action, created_at: nowStr() });
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function getLocations(db) {
	return db.select().from(locations).where(ne(locations.is_deleted, 1)).orderBy(desc(locations.id));
}

export async function createLocation(db, { name, address }) {
	const [result] = await db
		.insert(locations)
		.values({ name, address: address || null })
		.returning({ id: locations.id });
	return result.id;
}

export async function updateLocation(db, id, { name, address }) {
	await db
		.update(locations)
		.set({ name, address: address || null })
		.where(eq(locations.id, id));
}

export async function deleteLocation(db, id) {
	await db.update(locations).set({ is_deleted: 1 }).where(eq(locations.id, id));
}

// ── Calendar Entries ──────────────────────────────────────────────────────────

/**
 * Returns the concrete occurrences whose start_time falls within [from, to]
 * (inclusive). Recurring events are already materialised as rows, so this is a
 * plain range query. Each row carries `is_recurring` (true when part of a series).
 */
export async function getCalendarEntries(db, { from, to } = {}) {
	const where = from && to ? and(gte(calendar_entries.start_time, from), lte(calendar_entries.start_time, to)) : from ? gte(calendar_entries.start_time, from) : undefined;

	const rows = await db
		.select(entryColumns)
		.from(calendar_entries)
		.leftJoin(locations, eq(locations.id, calendar_entries.location_id))
		.leftJoin(family, eq(family.id, calendar_entries.created_by))
		.where(where)
		.orderBy(asc(calendar_entries.start_time));

	return rows.map((r) => ({ ...r, is_recurring: r.series_id != null }));
}

export async function getCalendarEntryById(db, id) {
	const [row] = await db
		.select(entryColumns)
		.from(calendar_entries)
		.leftJoin(locations, eq(locations.id, calendar_entries.location_id))
		.leftJoin(family, eq(family.id, calendar_entries.created_by))
		.where(eq(calendar_entries.id, id));
	if (!row) {
		return null;
	}
	return { ...row, is_recurring: row.series_id != null };
}

/** Loads the raw occurrence row (no joins) for series bookkeeping. */
async function getOccurrenceRow(db, id) {
	const [row] = await db.select().from(calendar_entries).where(eq(calendar_entries.id, id));
	return row ?? null;
}

/**
 * Materialises a recurring series: a head row (the first occurrence, carrying
 * the rule) plus one row per occurrence up to the horizon. Returns the head id.
 */
async function materializeSeries(db, fields) {
	const recurrence = normalizeRecurrence(fields.recurrence);
	const recurrence_end = fields.recurrence_end || null;
	const horizon = horizonString();

	const [head] = await db
		.insert(calendar_entries)
		.values(occurrenceRow(fields, { start_time: fields.start_time, end_time: fields.end_time }, { series_id: null, is_series_head: 1, recurrence, recurrence_end, generated_until: fields.start_time }))
		.returning({ id: calendar_entries.id });

	// A series is identified by its head's id.
	await db.update(calendar_entries).set({ series_id: head.id }).where(eq(calendar_entries.id, head.id));

	const occ = generateOccurrences({ start_time: fields.start_time, end_time: fields.end_time, recurrence, recurrence_end }, { after: fields.start_time, through: horizon });
	if (occ.length) {
		await db.insert(calendar_entries).values(occ.map((o) => occurrenceRow(fields, o, { series_id: head.id, is_series_head: 0, recurrence, recurrence_end, generated_until: null })));
		await db
			.update(calendar_entries)
			.set({ generated_until: occ[occ.length - 1].start_time })
			.where(eq(calendar_entries.id, head.id));
	}

	return head.id;
}

/** Inserts an event (a single one-off row or a full materialised series). */
async function insertEvent(db, fields) {
	const recurrence = normalizeRecurrence(fields.recurrence ?? 'none');
	if (recurrence === 'none') {
		const [r] = await db
			.insert(calendar_entries)
			.values(occurrenceRow(fields, { start_time: fields.start_time, end_time: fields.end_time }, { series_id: null, is_series_head: 0, recurrence: 'none', recurrence_end: null, generated_until: null }))
			.returning({ id: calendar_entries.id });
		return r.id;
	}
	return materializeSeries(db, { ...fields, recurrence });
}

export async function createCalendarEntry(db, fields) {
	const id = await insertEvent(db, fields);
	await addEvent(db, { rel_id: id, action: 'created', title: fields.title, start_time: fields.start_time });
	return id;
}

/**
 * Edits an event with "this and following" semantics. For a one-off this is a
 * plain update. For a recurring occurrence it splits the series at that point:
 * the old series is capped just before it, and a new (edited) series/one-off is
 * created from the occurrence forward. Editing the first occurrence therefore
 * rewrites the whole series. Returns the id of the (possibly new) head/event.
 */
export async function updateCalendarEntry(db, id, fields) {
	const occ = await getOccurrenceRow(db, id);
	if (!occ) {
		return null;
	}
	const newRecurrence = normalizeRecurrence(fields.recurrence ?? 'none');

	// One-off staying a one-off → update in place. created_by (ownership) is
	// deliberately left untouched; an edit never changes who created the event.
	if (occ.series_id == null && newRecurrence === 'none') {
		await db
			.update(calendar_entries)
			.set({
				title: fields.title,
				location_id: fields.location_id || null,
				start_time: fields.start_time,
				end_time: fields.end_time,
				description: fields.description || null,
				all_day: fields.all_day ? 1 : 0,
				recurrence: 'none',
				recurrence_end: null
			})
			.where(eq(calendar_entries.id, id));
		await addEvent(db, { rel_id: id, action: 'updated', title: fields.title, start_time: fields.start_time });
		return id;
	}

	const created_by = occ.created_by;

	if (occ.series_id != null) {
		// Split "this and following": drop this + later occurrences of the series…
		const splitAt = occ.start_time;
		await db.delete(calendar_entries).where(and(eq(calendar_entries.series_id, occ.series_id), gte(calendar_entries.start_time, splitAt)));

		// …and cap the old series just before the split if earlier rows remain.
		const remaining = await db.select({ id: calendar_entries.id }).from(calendar_entries).where(eq(calendar_entries.series_id, occ.series_id));
		if (remaining.length) {
			const cap = dayBefore(splitAt);
			await db
				.update(calendar_entries)
				.set({ recurrence_end: cap, generated_until: `${cap} 23:59:59` })
				.where(eq(calendar_entries.series_id, occ.series_id));
		}
	} else {
		// One-off becoming recurring → replace the single row.
		await db.delete(calendar_entries).where(eq(calendar_entries.id, id));
	}

	const newId = await insertEvent(db, { ...fields, created_by, recurrence: newRecurrence });
	await addEvent(db, { rel_id: newId, action: 'updated', title: fields.title, start_time: fields.start_time });
	return newId;
}

/**
 * Deletes an event with "this and following" semantics. A one-off is removed;
 * a recurring occurrence removes itself and all later occurrences (deleting the
 * first occurrence removes the whole series).
 */
export async function deleteCalendarEntry(db, id) {
	const occ = await getOccurrenceRow(db, id);
	if (!occ) {
		return;
	}

	if (occ.series_id == null) {
		await db.delete(calendar_entries).where(eq(calendar_entries.id, id));
	} else {
		const splitAt = occ.start_time;
		await db.delete(calendar_entries).where(and(eq(calendar_entries.series_id, occ.series_id), gte(calendar_entries.start_time, splitAt)));
		const remaining = await db.select({ id: calendar_entries.id }).from(calendar_entries).where(eq(calendar_entries.series_id, occ.series_id));
		if (remaining.length) {
			const cap = dayBefore(splitAt);
			await db
				.update(calendar_entries)
				.set({ recurrence_end: cap, generated_until: `${cap} 23:59:59` })
				.where(eq(calendar_entries.series_id, occ.series_id));
		}
	}

	await addEvent(db, { rel_id: id, action: 'deleted', title: occ.title, start_time: occ.start_time });
}

/**
 * Extends every active series forward to the horizon, materialising any missing
 * occurrences. Idempotent and cheap when nothing is due. Call opportunistically
 * on writes and from the /api/calendar/heal cron endpoint.
 */
export async function healCalendarSeries(db, horizon = horizonString()) {
	const heads = await db
		.select()
		.from(calendar_entries)
		.where(and(eq(calendar_entries.is_series_head, 1), ne(calendar_entries.recurrence, 'none')));

	let healed = 0;
	let generated = 0;

	for (const head of heads) {
		const genUntil = head.generated_until || head.start_time;
		if (genUntil >= horizon) {
			continue;
		}
		const occ = generateOccurrences({ start_time: head.start_time, end_time: head.end_time, recurrence: head.recurrence, recurrence_end: head.recurrence_end }, { after: genUntil, through: horizon });
		if (!occ.length) {
			continue;
		}
		await db.insert(calendar_entries).values(
			occ.map((o) =>
				occurrenceRow(
					{ title: head.title, location_id: head.location_id, description: head.description, created_by: head.created_by, all_day: head.all_day },
					o,
					{ series_id: head.series_id, is_series_head: 0, recurrence: head.recurrence, recurrence_end: head.recurrence_end, generated_until: null }
				)
			)
		);
		await db
			.update(calendar_entries)
			.set({ generated_until: occ[occ.length - 1].start_time })
			.where(eq(calendar_entries.id, head.id));
		healed++;
		generated += occ.length;
	}

	return { healed, generated };
}

export async function duplicateCalendarEntry(db, id, created_by) {
	const entry = await getCalendarEntryById(db, id);
	if (!entry) {
		return null;
	}
	const now = new Date();
	const duration = parseUtc(entry.end_time) - parseUtc(entry.start_time);

	let start_time;
	let end_time;
	if (entry.all_day) {
		// All-day dates are floating: re-anchor to today's date at 00:00:00 UTC
		// and preserve the original span in whole days.
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 00:00:00`;
		const todayStart = parseUtc(todayStr);
		start_time = todayStr;
		end_time = toUtcString(new Date(todayStart.getTime() + duration));
	} else {
		// Re-anchor to today, preserving the original time-of-day in local time.
		const original = parseUtc(entry.start_time);
		const newStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), original.getHours(), original.getMinutes());
		start_time = toUtcString(newStart);
		end_time = toUtcString(new Date(newStart.getTime() + duration));
	}

	// A duplicate is a single copy — the recurrence rule is intentionally dropped.
	return createCalendarEntry(db, {
		title: entry.title,
		location_id: entry.location_id,
		start_time,
		end_time,
		description: entry.description,
		created_by,
		all_day: entry.all_day
	});
}
