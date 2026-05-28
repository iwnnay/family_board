import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeUser, makeMember } from '../helpers.js';
import { note_bodies, recent_events } from '$lib/server/schema/sqlite.js';
import { createNote, getNotes, getNoteWithBodies, updateNote, deleteNote, togglePin, getRecentEvents } from '$lib/server/queries/notes.js';

describe('createNote', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('inserts just the note when no bodies are provided', async () => {
		const id = await createNote(db, {
			title: 'Plain note',
			summary: 'a summary',
			color: 'blue',
			created_by: memberId,
			bodies: []
		});

		const notes = await getNotes(db);
		expect(notes).toHaveLength(1);
		expect(notes[0].id).toBe(id);

		const bodies = await db.select().from(note_bodies).where(eq(note_bodies.note_id, id));
		expect(bodies).toHaveLength(0);
	});

	it('inserts the note, its bodies, and a recent_event when bodies are provided', async () => {
		const id = await createNote(db, {
			title: 'Rich note',
			summary: 'sum',
			color: 'red',
			created_by: memberId,
			bodies: [
				{ subtitle: 'First', body: 'one' },
				{ subtitle: 'Second', body: 'two' }
			]
		});

		const bodies = await db.select().from(note_bodies).where(eq(note_bodies.note_id, id));
		expect(bodies).toHaveLength(2);

		const events = await db.select().from(recent_events).where(eq(recent_events.rel_id, id));
		expect(events).toHaveLength(1);
		expect(events[0].action).toBe('created');
	});
});

describe('getNotes', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
		await makeUser(db, { username: 'bob' });
	});

	it('returns notes with pinned=false when no userId is passed', async () => {
		await createNote(db, { title: 'One', summary: '', color: null, created_by: memberId, bodies: [] });
		const rows = await getNotes(db);
		expect(rows).toHaveLength(1);
		expect(rows[0].pinned).toBe(false);
	});

	it('marks pinned notes correctly when userId is passed', async () => {
		const aId = await createNote(db, { title: 'A', summary: '', color: null, created_by: memberId, bodies: [] });
		const bId = await createNote(db, { title: 'B', summary: '', color: null, created_by: memberId, bodies: [] });
		await togglePin(db, memberId, aId, 'note');

		const rows = await getNotes(db, memberId);
		const aRow = rows.find((r) => r.id === aId);
		const bRow = rows.find((r) => r.id === bId);
		expect(aRow.pinned).toBe(true);
		expect(bRow.pinned).toBe(false);
	});
});

describe('getNoteWithBodies', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('returns the note with its bodies sorted by sort_order', async () => {
		const id = await createNote(db, {
			title: 'Sorted',
			summary: '',
			color: null,
			created_by: memberId,
			bodies: [
				{ subtitle: 'first', body: '1' },
				{ subtitle: 'second', body: '2' },
				{ subtitle: 'third', body: '3' }
			]
		});

		const result = await getNoteWithBodies(db, id);
		expect(result.title).toBe('Sorted');
		expect(result.bodies).toHaveLength(3);
		expect(result.bodies.map((b) => b.sort_order)).toEqual([0, 1, 2]);
		expect(result.bodies.map((b) => b.subtitle)).toEqual(['first', 'second', 'third']);
	});

	it('returns null when no note matches', async () => {
		expect(await getNoteWithBodies(db, 9999)).toBeNull();
	});
});

describe('updateNote', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('replaces the bodies completely on update', async () => {
		const id = await createNote(db, {
			title: 'Note',
			summary: '',
			color: null,
			created_by: memberId,
			bodies: [
				{ subtitle: 'old1', body: 'a' },
				{ subtitle: 'old2', body: 'b' }
			]
		});

		await updateNote(db, id, {
			title: 'Note',
			summary: '',
			color: null,
			bodies: [{ subtitle: 'new', body: 'replaced' }]
		});

		const result = await getNoteWithBodies(db, id);
		expect(result.bodies).toHaveLength(1);
		expect(result.bodies[0].subtitle).toBe('new');
		expect(result.bodies[0].body).toBe('replaced');
	});
});

describe('deleteNote', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('removes the note and cascades its bodies', async () => {
		const id = await createNote(db, {
			title: 'Doomed',
			summary: '',
			color: null,
			created_by: memberId,
			bodies: [{ subtitle: 's', body: 'b' }]
		});

		await deleteNote(db, id);

		expect(await getNoteWithBodies(db, id)).toBeNull();
		const bodies = await db.select().from(note_bodies).where(eq(note_bodies.note_id, id));
		expect(bodies).toHaveLength(0);
	});
});

describe('togglePin', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('first call pins the note', async () => {
		const noteId = await createNote(db, { title: 'X', summary: '', color: null, created_by: memberId, bodies: [] });
		await togglePin(db, memberId, noteId, 'note');
		const rows = await getNotes(db, memberId);
		expect(rows[0].pinned).toBe(true);
	});

	it('second call unpins the note', async () => {
		const noteId = await createNote(db, { title: 'X', summary: '', color: null, created_by: memberId, bodies: [] });
		await togglePin(db, memberId, noteId, 'note');
		await togglePin(db, memberId, noteId, 'note');
		const rows = await getNotes(db, memberId);
		expect(rows[0].pinned).toBe(false);
	});
});

describe('getRecentEvents', () => {
	let db;
	let memberId;

	beforeEach(async () => {
		db = makeDb();
		const member = await makeMember(db, 'Alice');
		memberId = member.id;
	});

	it('returns events from the last 30 days', async () => {
		await createNote(db, { title: 'Fresh', summary: '', color: null, created_by: memberId, bodies: [] });
		const rows = await getRecentEvents(db);
		expect(rows.length).toBeGreaterThanOrEqual(1);
	});

	it('excludes events older than 30 days', async () => {
		const id = await createNote(db, { title: 'Old', summary: '', color: null, created_by: memberId, bodies: [] });
		// Force the event row to be old
		await db.update(recent_events).set({ created_at: '2020-01-01 00:00:00' }).where(eq(recent_events.rel_id, id));

		const rows = await getRecentEvents(db);
		expect(rows).toHaveLength(0);
	});
});
