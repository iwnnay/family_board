import { eq, and, gte, lte, asc, desc, ne } from 'drizzle-orm';
import { calendar_entries, locations, recent_events, family } from '../schema/index.js';
import { toUtcString, parseUtc } from '$lib/time.js';

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

export async function getCalendarEntries(db, { from, to } = {}) {
	const rows = await db
		.select({
			id: calendar_entries.id,
			title: calendar_entries.title,
			start_time: calendar_entries.start_time,
			end_time: calendar_entries.end_time,
			description: calendar_entries.description,
			created_by: calendar_entries.created_by,
			created_by_color: family.color,
			location_id: calendar_entries.location_id,
			location_name: locations.name,
			location_address: locations.address
		})
		.from(calendar_entries)
		.leftJoin(locations, eq(locations.id, calendar_entries.location_id))
		.leftJoin(family, eq(family.id, calendar_entries.created_by))
		.where(from && to ? and(gte(calendar_entries.start_time, from), lte(calendar_entries.start_time, to)) : from ? gte(calendar_entries.start_time, from) : undefined)
		.orderBy(asc(calendar_entries.start_time));
	return rows;
}

export async function getCalendarEntryById(db, id) {
	const [row] = await db
		.select({
			id: calendar_entries.id,
			title: calendar_entries.title,
			start_time: calendar_entries.start_time,
			end_time: calendar_entries.end_time,
			description: calendar_entries.description,
			created_by: calendar_entries.created_by,
			created_by_color: family.color,
			location_id: calendar_entries.location_id,
			location_name: locations.name,
			location_address: locations.address
		})
		.from(calendar_entries)
		.leftJoin(locations, eq(locations.id, calendar_entries.location_id))
		.leftJoin(family, eq(family.id, calendar_entries.created_by))
		.where(eq(calendar_entries.id, id));
	return row ?? null;
}

export async function createCalendarEntry(db, { title, location_id, start_time, end_time, description, created_by }) {
	const [result] = await db
		.insert(calendar_entries)
		.values({ title, location_id: location_id || null, start_time, end_time, description: description || null, created_by: created_by || null })
		.returning({ id: calendar_entries.id });
	await addEvent(db, { rel_id: result.id, action: 'created', title, start_time });
	return result.id;
}

export async function updateCalendarEntry(db, id, { title, location_id, start_time, end_time, description }) {
	await db
		.update(calendar_entries)
		.set({ title, location_id: location_id || null, start_time, end_time, description: description || null })
		.where(eq(calendar_entries.id, id));
	await addEvent(db, { rel_id: id, action: 'updated', title, start_time });
}

export async function deleteCalendarEntry(db, id) {
	const entry = await getCalendarEntryById(db, id);
	await db.delete(calendar_entries).where(eq(calendar_entries.id, id));
	if (entry) {
		await addEvent(db, { rel_id: id, action: 'deleted', title: entry.title, start_time: entry.start_time });
	}
}

export async function duplicateCalendarEntry(db, id, created_by) {
	const entry = await getCalendarEntryById(db, id);
	if (!entry) {
		return null;
	}
	const now = new Date();
	const original = parseUtc(entry.start_time);
	const duration = parseUtc(entry.end_time) - parseUtc(entry.start_time);
	// Re-anchor to today, preserving the original time-of-day in local time
	const newStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), original.getHours(), original.getMinutes());
	const newEnd = new Date(newStart.getTime() + duration);
	return createCalendarEntry(db, {
		title: entry.title,
		location_id: entry.location_id,
		start_time: toUtcString(newStart),
		end_time: toUtcString(newEnd),
		description: entry.description,
		created_by
	});
}
