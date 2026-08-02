import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { createTestDb } from '$lib/server/db.js';
import { list_items } from '$lib/server/schema/sqlite.js';
import { createList, addListItem, getListItem, setListItemSteps } from '$lib/server/queries/lists.js';

/**
 * `CREATE TABLE IF NOT EXISTS` never alters a table that already exists, so
 * databases created before a column was added rely on the ensureColumn()
 * backfill in createTestDb. This exercises that path against the pre-existing
 * list_items shape.
 */
function legacyDatabase() {
	const sqlite = new Database(':memory:');
	sqlite.exec(`
		CREATE TABLE family (
			id      INTEGER PRIMARY KEY AUTOINCREMENT,
			name    TEXT NOT NULL,
			color   TEXT,
			user_id INTEGER
		);
		CREATE TABLE lists (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			title      TEXT NOT NULL,
			created_by INTEGER,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE list_items (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			list_id      INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
			item         TEXT NOT NULL,
			completed_at TEXT
		);
	`);
	sqlite.prepare("INSERT INTO lists (title, created_at, updated_at) VALUES ('Old list', '2024-01-01 00:00:00', '2024-01-01 00:00:00')").run();
	sqlite.prepare("INSERT INTO list_items (list_id, item) VALUES (1, 'pre-existing item')").run();
	return sqlite;
}

describe('opening a database created before list items grew columns', () => {
	it('backfills the new columns and keeps existing rows readable', async () => {
		const db = createTestDb(legacyDatabase());

		const existing = await getListItem(db, 1);
		expect(existing.item).toBe('pre-existing item');
		expect(existing.due_date).toBeNull();
		expect(existing.priority).toBe('none');
		expect(existing.image).toBeNull();
	});

	it('accepts writes that use the new columns', async () => {
		const db = createTestDb(legacyDatabase());

		const listId = await createList(db, { title: 'New list', created_by: null });
		const itemId = await addListItem(db, { list_id: listId, item: 'Clean the gutter', due_date: '2026-08-06', priority: 'high' });
		await setListItemSteps(db, itemId, [{ step: 'get ladder' }]);

		expect(await getListItem(db, itemId)).toMatchObject({ due_date: '2026-08-06', priority: 'high' });
		expect((await getListItem(db, itemId)).steps).toHaveLength(1);
		expect(await db.select().from(list_items).where(eq(list_items.id, itemId))).toHaveLength(1);
	});
});
