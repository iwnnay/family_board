import { describe, it, expect, beforeEach } from 'vitest';
import { eq, gt } from 'drizzle-orm';
import { makeDb, makeMember } from '../helpers.js';
import { recent_events, locations, calendar_entries } from '$lib/server/schema/sqlite.js';
import { parseUtc } from '$lib/time.js';
import {
	createLocation,
	getLocations,
	deleteLocation,
	createCalendarEntry,
	getCalendarEntries,
	getCalendarEntryById,
	updateCalendarEntry,
	deleteCalendarEntry,
	duplicateCalendarEntry,
	healCalendarSeries
} from '$lib/server/queries/calendar.js';

const WIDE = { from: '2000-01-01 00:00:00', to: '2100-01-01 00:00:00' };

/** All occurrences for a member's calendar, across all time. */
async function allEntries(db) {
	return getCalendarEntries(db, WIDE);
}

/** Find the occurrence whose start_time matches exactly. */
async function occurrenceAt(db, start_time) {
	const rows = await allEntries(db);
	return rows.find((r) => r.start_time === start_time);
}

describe('createLocation / getLocations', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns empty when no locations exist', async () => {
		expect(await getLocations(db)).toEqual([]);
	});

	it('returns created locations and excludes soft-deleted ones', async () => {
		const aId = await createLocation(db, { name: 'Home', address: '123 Main St' });
		const bId = await createLocation(db, { name: 'School', address: null });
		await deleteLocation(db, aId);

		const rows = await getLocations(db);
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(bId);
		expect(rows[0].name).toBe('School');
	});
});

describe('deleteLocation', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('soft-deletes by setting is_deleted to 1', async () => {
		const id = await createLocation(db, { name: 'Gym', address: null });
		await deleteLocation(db, id);
		const [row] = await db.select().from(locations).where(eq(locations.id, id));
		expect(row.is_deleted).toBe(1);
	});
});

describe('createCalendarEntry', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('creates an entry and a recent_event', async () => {
		const id = await createCalendarEntry(db, {
			title: 'Soccer',
			location_id: null,
			start_time: '2026-06-15 16:00:00',
			end_time: '2026-06-15 17:00:00',
			description: null,
			created_by: memberId
		});

		const entry = await getCalendarEntryById(db, id);
		expect(entry.title).toBe('Soccer');

		const events = await db.select().from(recent_events).where(eq(recent_events.rel_id, id));
		expect(events).toHaveLength(1);
		expect(events[0].action).toBe('created');
		expect(events[0].type).toBe('calendar');
	});
});

describe('getCalendarEntries', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;

		await createCalendarEntry(db, {
			title: 'May',
			location_id: null,
			start_time: '2026-05-15 09:00:00',
			end_time: '2026-05-15 10:00:00',
			description: null,
			created_by: memberId
		});
		await createCalendarEntry(db, {
			title: 'June',
			location_id: null,
			start_time: '2026-06-15 09:00:00',
			end_time: '2026-06-15 10:00:00',
			description: null,
			created_by: memberId
		});
		await createCalendarEntry(db, {
			title: 'July',
			location_id: null,
			start_time: '2026-07-15 09:00:00',
			end_time: '2026-07-15 10:00:00',
			description: null,
			created_by: memberId
		});
	});

	it('filters by from/to range', async () => {
		const rows = await getCalendarEntries(db, {
			from: '2026-06-01 00:00:00',
			to: '2026-06-30 23:59:59'
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].title).toBe('June');
	});

	it('returns entries from a date onwards when only `from` is provided', async () => {
		const rows = await getCalendarEntries(db, { from: '2026-06-01 00:00:00' });
		expect(rows.map((r) => r.title)).toEqual(['June', 'July']);
	});

	it('returns all entries when no range is provided', async () => {
		const rows = await getCalendarEntries(db);
		expect(rows).toHaveLength(3);
	});
});

describe('getCalendarEntries — recurring expansion', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('expands a weekly entry into one occurrence per week in range', async () => {
		await createCalendarEntry(db, {
			title: 'Standup',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:15:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});

		const rows = await getCalendarEntries(db, { from: '2026-06-01 00:00:00', to: '2026-06-30 23:59:59' });
		expect(rows.map((r) => r.start_time)).toEqual(['2026-06-01 09:00:00', '2026-06-08 09:00:00', '2026-06-15 09:00:00', '2026-06-22 09:00:00', '2026-06-29 09:00:00']);
		expect(rows.every((r) => r.is_recurring && r.title === 'Standup')).toBe(true);
	});

	it('includes occurrences for a series that started before the window', async () => {
		await createCalendarEntry(db, {
			title: 'Weekly',
			location_id: null,
			start_time: '2026-01-05 14:00:00',
			end_time: '2026-01-05 15:00:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});

		const rows = await getCalendarEntries(db, { from: '2026-03-01 00:00:00', to: '2026-03-31 23:59:59' });
		expect(rows.map((r) => r.start_time)).toEqual(['2026-03-02 14:00:00', '2026-03-09 14:00:00', '2026-03-16 14:00:00', '2026-03-23 14:00:00', '2026-03-30 14:00:00']);
	});

	it('respects recurrence_end', async () => {
		await createCalendarEntry(db, {
			title: 'Limited',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 10:00:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly',
			recurrence_end: '2026-06-15'
		});

		const rows = await getCalendarEntries(db, { from: '2026-06-01 00:00:00', to: '2026-12-31 23:59:59' });
		expect(rows.map((r) => r.start_time)).toEqual(['2026-06-01 09:00:00', '2026-06-08 09:00:00', '2026-06-15 09:00:00']);
	});

	it('merges recurring occurrences with one-off events in sorted order', async () => {
		await createCalendarEntry(db, {
			title: 'Weekly',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 10:00:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});
		await createCalendarEntry(db, {
			title: 'Oneoff',
			location_id: null,
			start_time: '2026-06-03 12:00:00',
			end_time: '2026-06-03 13:00:00',
			description: null,
			created_by: memberId
		});

		const rows = await getCalendarEntries(db, { from: '2026-06-01 00:00:00', to: '2026-06-10 23:59:59' });
		expect(rows.map((r) => r.title)).toEqual(['Weekly', 'Oneoff', 'Weekly']);
	});
});

describe('materialized series', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('creates one head plus materialized occurrence rows sharing a series_id', async () => {
		await createCalendarEntry(db, {
			title: 'Standup',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:15:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});

		const heads = await db.select().from(calendar_entries).where(eq(calendar_entries.is_series_head, 1));
		expect(heads).toHaveLength(1);
		const head = heads[0];
		expect(head.series_id).toBe(head.id);
		expect(head.recurrence).toBe('weekly');
		expect(head.generated_until).not.toBeNull();

		const all = await db.select().from(calendar_entries);
		// ~2 years of weekly occurrences materialized.
		expect(all.length).toBeGreaterThan(50);
		expect(all.every((r) => r.series_id === head.id)).toBe(true);
		expect((await allEntries(db)).every((r) => r.is_recurring)).toBe(true);
	});
});

describe('edit "this and following"', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		await createCalendarEntry(db, {
			title: 'Standup',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:30:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});
	});

	it('splits at the chosen occurrence, leaving earlier ones untouched', async () => {
		const target = await occurrenceAt(db, '2026-06-15 09:00:00');
		await updateCalendarEntry(db, target.id, {
			title: 'Renamed',
			location_id: null,
			start_time: '2026-06-15 09:00:00',
			end_time: '2026-06-15 09:30:00',
			description: null,
			all_day: 0,
			recurrence: 'weekly',
			recurrence_end: null
		});

		const june = await getCalendarEntries(db, { from: '2026-06-01 00:00:00', to: '2026-06-30 23:59:59' });
		expect(june.map((r) => `${r.start_time.slice(8, 10)}:${r.title}`)).toEqual(['01:Standup', '08:Standup', '15:Renamed', '22:Renamed', '29:Renamed']);
	});

	it('editing the first occurrence rewrites the whole series', async () => {
		const head = await occurrenceAt(db, '2026-06-01 09:00:00');
		await updateCalendarEntry(db, head.id, {
			title: 'All Changed',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:30:00',
			description: null,
			all_day: 0,
			recurrence: 'weekly',
			recurrence_end: null
		});

		const all = await allEntries(db);
		expect(all.every((r) => r.title === 'All Changed')).toBe(true);
		// Exactly one series head remains.
		const heads = await db.select().from(calendar_entries).where(eq(calendar_entries.is_series_head, 1));
		expect(heads).toHaveLength(1);
	});
});

describe('delete "this and following"', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		await createCalendarEntry(db, {
			title: 'Standup',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:30:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});
	});

	it('removes the chosen occurrence and everything after it', async () => {
		const target = await occurrenceAt(db, '2026-06-15 09:00:00');
		await deleteCalendarEntry(db, target.id);

		const remaining = await allEntries(db);
		expect(remaining.map((r) => r.start_time)).toEqual(['2026-06-01 09:00:00', '2026-06-08 09:00:00']);
	});

	it('deleting the first occurrence removes the whole series', async () => {
		const head = await occurrenceAt(db, '2026-06-01 09:00:00');
		await deleteCalendarEntry(db, head.id);
		expect(await allEntries(db)).toHaveLength(0);
	});
});

describe('healCalendarSeries', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('re-materializes occurrences trimmed below the horizon', async () => {
		await createCalendarEntry(db, {
			title: 'Standup',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:30:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});

		const originalCount = (await db.select().from(calendar_entries)).length;

		// Simulate a stale horizon: drop everything after a cutoff and rewind
		// the head's generated_until to that cutoff.
		const cutoff = '2026-09-01 00:00:00';
		await db.delete(calendar_entries).where(gt(calendar_entries.start_time, cutoff));
		await db.update(calendar_entries).set({ generated_until: cutoff }).where(eq(calendar_entries.is_series_head, 1));
		const trimmedCount = (await db.select().from(calendar_entries)).length;
		expect(trimmedCount).toBeLessThan(originalCount);

		const result = await healCalendarSeries(db);
		expect(result.healed).toBe(1);
		expect(result.generated).toBe(originalCount - trimmedCount);
		expect((await db.select().from(calendar_entries)).length).toBe(originalCount);
	});

	it('is a no-op when series are already generated through the horizon', async () => {
		await createCalendarEntry(db, {
			title: 'Standup',
			location_id: null,
			start_time: '2026-06-01 09:00:00',
			end_time: '2026-06-01 09:30:00',
			description: null,
			created_by: memberId,
			recurrence: 'weekly'
		});
		const result = await healCalendarSeries(db);
		expect(result).toEqual({ healed: 0, generated: 0 });
	});
});

describe('all-day events', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('round-trips the all_day flag', async () => {
		const id = await createCalendarEntry(db, {
			title: 'Holiday',
			location_id: null,
			start_time: '2026-07-04 00:00:00',
			end_time: '2026-07-04 00:00:00',
			description: null,
			created_by: memberId,
			all_day: 1
		});
		const entry = await getCalendarEntryById(db, id);
		expect(entry.all_day).toBe(1);
	});

	it('re-anchors an all-day duplicate to today as a floating date', async () => {
		const id = await createCalendarEntry(db, {
			title: 'Holiday',
			location_id: null,
			start_time: '2020-07-04 00:00:00',
			end_time: '2020-07-04 00:00:00',
			description: null,
			created_by: memberId,
			all_day: 1
		});
		const newId = await duplicateCalendarEntry(db, id, memberId);
		const dup = await getCalendarEntryById(db, newId);

		const now = new Date();
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 00:00:00`;
		expect(dup.all_day).toBe(1);
		expect(dup.start_time).toBe(todayStr);
	});
});

describe('duplicateCalendarEntry', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('preserves time-of-day and duration', async () => {
		// Stored as UTC; '2020-01-01 14:30:00' = 14:30 UTC = local time-of-day varies by TZ
		const originalId = await createCalendarEntry(db, {
			title: 'Recurring',
			location_id: null,
			start_time: '2020-01-01 14:30:00',
			end_time: '2020-01-01 15:45:00',
			description: 'meet',
			created_by: memberId
		});

		const newId = await duplicateCalendarEntry(db, originalId, memberId);
		const dup = await getCalendarEntryById(db, newId);

		// Parse stored (UTC) values back to Dates
		const originalStart = parseUtc('2020-01-01 14:30:00');
		const dupStart = parseUtc(dup.start_time);
		const dupEnd = parseUtc(dup.end_time);

		// Same time-of-day in local time
		expect(dupStart.getHours()).toBe(originalStart.getHours());
		expect(dupStart.getMinutes()).toBe(originalStart.getMinutes());

		// Anchored to today (local)
		const today = new Date();
		expect(dupStart.getFullYear()).toBe(today.getFullYear());
		expect(dupStart.getMonth()).toBe(today.getMonth());
		expect(dupStart.getDate()).toBe(today.getDate());

		// Duration preserved (75 minutes)
		expect(dupEnd.getTime() - dupStart.getTime()).toBe(75 * 60 * 1000);
	});
});

describe('updateCalendarEntry', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('updates title, times, and description', async () => {
		const id = await createCalendarEntry(db, {
			title: 'Old',
			location_id: null,
			start_time: '2026-06-15 09:00:00',
			end_time: '2026-06-15 10:00:00',
			description: 'old desc',
			created_by: memberId
		});

		await updateCalendarEntry(db, id, {
			title: 'New',
			location_id: null,
			start_time: '2026-06-16 12:00:00',
			end_time: '2026-06-16 13:00:00',
			description: 'new desc'
		});

		const entry = await getCalendarEntryById(db, id);
		expect(entry.title).toBe('New');
		expect(entry.start_time).toBe('2026-06-16 12:00:00');
		expect(entry.description).toBe('new desc');
	});

	it('preserves created_by (ownership) across an edit', async () => {
		const id = await createCalendarEntry(db, {
			title: 'Mine',
			location_id: null,
			start_time: '2026-06-15 09:00:00',
			end_time: '2026-06-15 10:00:00',
			description: null,
			created_by: memberId
		});

		// The edit form never submits created_by.
		await updateCalendarEntry(db, id, {
			title: 'Still mine',
			location_id: null,
			start_time: '2026-06-15 09:00:00',
			end_time: '2026-06-15 10:00:00',
			description: null,
			all_day: 0,
			recurrence: 'none',
			recurrence_end: null
		});

		const entry = await getCalendarEntryById(db, id);
		expect(entry.created_by).toBe(memberId);
	});
});

describe('deleteCalendarEntry', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('removes the entry', async () => {
		const id = await createCalendarEntry(db, {
			title: 'Doomed',
			location_id: null,
			start_time: '2026-06-15 09:00:00',
			end_time: '2026-06-15 10:00:00',
			description: null,
			created_by: memberId
		});

		await deleteCalendarEntry(db, id);
		expect(await getCalendarEntryById(db, id)).toBeNull();
	});
});
