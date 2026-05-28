import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeMember } from '../helpers.js';
import { recent_events, locations } from '$lib/server/schema/sqlite.js';
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
	duplicateCalendarEntry
} from '$lib/server/queries/calendar.js';

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
