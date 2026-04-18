import { eq, desc, and, gte } from 'drizzle-orm';
import { notes, note_bodies, user_pins, recent_events, family } from '../schema/index.js';

function nowStr() {
	return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function thirtyDaysAgo() {
	const d = new Date();
	d.setDate(d.getDate() - 30);
	return d.toISOString().replace('T', ' ').substring(0, 19);
}

export async function getNotes(db, userId = null) {
	const rows = await db
		.select({
			id: notes.id,
			title: notes.title,
			summary: notes.summary,
			color: notes.color,
			created_by: notes.created_by,
			created_at: notes.created_at,
			updated_at: notes.updated_at
		})
		.from(notes)
		.orderBy(desc(notes.updated_at));

	if (!userId) {
		return rows.map((n) => ({ ...n, pinned: false }));
	}

	const pins = await db.select({ rel_id: user_pins.rel_id }).from(user_pins).where(and(eq(user_pins.user_id, userId), eq(user_pins.rel_type, 'note')));

	const pinnedIds = new Set(pins.map((p) => p.rel_id));
	const pinned = rows.filter((n) => pinnedIds.has(n.id)).map((n) => ({ ...n, pinned: true }));
	const unpinned = rows.filter((n) => !pinnedIds.has(n.id)).map((n) => ({ ...n, pinned: false }));
	return [...pinned, ...unpinned];
}

export async function getNoteWithBodies(db, id) {
	const [note] = await db.select().from(notes).where(eq(notes.id, id));
	if (!note) {
		return null;
	}
	const bodies = await db.select().from(note_bodies).where(eq(note_bodies.note_id, id)).orderBy(note_bodies.sort_order);
	return { ...note, bodies };
}

export async function createNote(db, { title, summary, color, created_by, bodies = [] }) {
	const now = nowStr();
	const [result] = await db.insert(notes).values({ title, summary, color, created_by, created_at: now, updated_at: now }).returning({ id: notes.id });
	const noteId = result.id;

	if (bodies.length > 0) {
		await db.insert(note_bodies).values(bodies.map((b, i) => ({ note_id: noteId, subtitle: b.subtitle, body: b.body, sort_order: i })));
	}

	await addEvent(db, { type: 'note', rel_id: noteId, rel_type: 'note', action: 'created', title: title || 'Untitled' });
	return noteId;
}

export async function updateNote(db, id, { title, summary, color, bodies = [] }) {
	const now = nowStr();
	await db.update(notes).set({ title, summary, color, updated_at: now }).where(eq(notes.id, id));
	await db.delete(note_bodies).where(eq(note_bodies.note_id, id));
	if (bodies.length > 0) {
		await db.insert(note_bodies).values(bodies.map((b, i) => ({ note_id: id, subtitle: b.subtitle, body: b.body, sort_order: i })));
	}
	await addEvent(db, { type: 'note', rel_id: id, rel_type: 'note', action: 'updated', title: title || 'Untitled' });
}

export async function deleteNote(db, id) {
	const [note] = await db.select({ title: notes.title }).from(notes).where(eq(notes.id, id));
	await db.delete(notes).where(eq(notes.id, id));
	await addEvent(db, { type: 'note', rel_id: id, rel_type: 'note', action: 'deleted', title: note?.title || 'Untitled' });
}

export async function togglePin(db, userId, relId, relType) {
	const [existing] = await db
		.select()
		.from(user_pins)
		.where(and(eq(user_pins.user_id, userId), eq(user_pins.rel_id, relId), eq(user_pins.rel_type, relType)));

	if (existing) {
		await db.delete(user_pins).where(eq(user_pins.id, existing.id));
	} else {
		await db.insert(user_pins).values({ user_id: userId, rel_id: relId, rel_type: relType, is_global: 0 });
	}
}

export async function getRecentEvents(db) {
	return db
		.select({
			id: recent_events.id,
			type: recent_events.type,
			message: recent_events.message,
			rel_id: recent_events.rel_id,
			rel_type: recent_events.rel_type,
			action: recent_events.action,
			created_at: recent_events.created_at
		})
		.from(recent_events)
		.where(gte(recent_events.created_at, thirtyDaysAgo()))
		.orderBy(desc(recent_events.created_at));
}

async function addEvent(db, { type, rel_id, rel_type, action, title }) {
	const message = `${rel_type} ${action}: ${title}`;
	await db.insert(recent_events).values({ type, message, rel_id, rel_type, action, created_at: nowStr() });
}
