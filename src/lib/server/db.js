import Database from 'better-sqlite3';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { isMysql } from './schema/index.js';
import * as sqliteSchema from './schema/sqlite.js';
import * as mysqlSchema from './schema/mysql.js';
import * as familyQ from './queries/family.js';
import * as choresQ from './queries/chores.js';
import * as completionsQ from './queries/completions.js';
import * as notesQ from './queries/notes.js';
import * as calendarQ from './queries/calendar.js';
import * as listsQ from './queries/lists.js';

// ---------------------------------------------------------------------------
// Raw SQL used only for dev SQLite setup (avoids needing drizzle-kit push)
// ---------------------------------------------------------------------------

const SQLITE_SETUP_SQL = `
  CREATE TABLE IF NOT EXISTS family (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    color TEXT
  );
  CREATE TABLE IF NOT EXISTS chores (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    frequency     TEXT NOT NULL DEFAULT 'none',
    suggested_day TEXT,
    image         TEXT
  );
  CREATE TABLE IF NOT EXISTS chores_completed (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id     INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    completed_by INTEGER NOT NULL REFERENCES family(id) ON DELETE CASCADE,
    completed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT,
    summary    TEXT,
    color      TEXT,
    created_by INTEGER REFERENCES family(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS note_bodies (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    subtitle   TEXT,
    body       TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS user_pins (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES family(id) ON DELETE CASCADE,
    rel_id    INTEGER NOT NULL,
    rel_type  TEXT NOT NULL,
    is_global INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS recent_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    message    TEXT NOT NULL,
    rel_id     INTEGER NOT NULL,
    rel_type   TEXT NOT NULL,
    action     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS locations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    address    TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS calendar_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    description TEXT,
    created_by  INTEGER REFERENCES family(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS lists (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    created_by INTEGER REFERENCES family(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS list_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id      INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    item         TEXT NOT NULL,
    completed_at TEXT
  );
`;

/**
 * Creates a Drizzle instance from a raw better-sqlite3 Database.
 * Runs CREATE TABLE IF NOT EXISTS so the dev database is always ready.
 * Pass `new Database(':memory:')` in tests for an isolated in-memory database.
 */
export function createTestDb(sqliteDb) {
	sqliteDb.pragma('journal_mode = WAL');
	sqliteDb.pragma('foreign_keys = ON');
	sqliteDb.exec(SQLITE_SETUP_SQL);
	return sqliteDrizzle(sqliteDb, { schema: sqliteSchema });
}

// ---------------------------------------------------------------------------
// Default app-wide instance
// ---------------------------------------------------------------------------

let db;

if (isMysql) {
	const pool = mysql.createPool(process.env.DATABASE_URL);
	db = mysqlDrizzle({ client: pool, schema: mysqlSchema, mode: 'default' });
} else {
	const dbDir = join(process.cwd(), 'storage');
	if (!existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
	}
	const sqlite = new Database(join(dbDir, 'family_board.db'));
	db = createTestDb(sqlite); // createTestDb handles pragmas + schema setup
}

// Re-export every query function bound to the app instance so that
// route files keep their existing import style:
//   import { getChores, addChore } from '$lib/server/db';

export const getFamilyMembers = () => familyQ.getFamilyMembers(db);
export const addFamilyMember = (...a) => familyQ.addFamilyMember(db, ...a);
export const updateFamilyMemberColor = (...a) => familyQ.updateFamilyMemberColor(db, ...a);
export const deleteFamilyMember = (...a) => familyQ.deleteFamilyMember(db, ...a);

export const getChores = () => choresQ.getChores(db);
export const getChoreById = (...a) => choresQ.getChoreById(db, ...a);
export const addChore = (...a) => choresQ.addChore(db, ...a);
export const updateChore = (...a) => choresQ.updateChore(db, ...a);
export const deleteChore = (...a) => choresQ.deleteChore(db, ...a);
export const getChoresWithStatus = (...a) => choresQ.getChoresWithStatus(db, ...a);

export const completeChore = (...a) => completionsQ.completeChore(db, ...a);
export const getStats = (...a) => completionsQ.getStats(db, ...a);

export const getLocations = (...a) => calendarQ.getLocations(db, ...a);
export const createLocation = (...a) => calendarQ.createLocation(db, ...a);
export const updateLocation = (...a) => calendarQ.updateLocation(db, ...a);
export const deleteLocation = (...a) => calendarQ.deleteLocation(db, ...a);

export const getCalendarEntries = (...a) => calendarQ.getCalendarEntries(db, ...a);
export const getCalendarEntryById = (...a) => calendarQ.getCalendarEntryById(db, ...a);
export const createCalendarEntry = (...a) => calendarQ.createCalendarEntry(db, ...a);
export const updateCalendarEntry = (...a) => calendarQ.updateCalendarEntry(db, ...a);
export const deleteCalendarEntry = (...a) => calendarQ.deleteCalendarEntry(db, ...a);
export const duplicateCalendarEntry = (...a) => calendarQ.duplicateCalendarEntry(db, ...a);

export const getNotes = (...a) => notesQ.getNotes(db, ...a);
export const getNoteWithBodies = (...a) => notesQ.getNoteWithBodies(db, ...a);
export const createNote = (...a) => notesQ.createNote(db, ...a);
export const updateNote = (...a) => notesQ.updateNote(db, ...a);
export const deleteNote = (...a) => notesQ.deleteNote(db, ...a);
export const togglePin = (...a) => notesQ.togglePin(db, ...a);
export const getRecentEvents = (...a) => notesQ.getRecentEvents(db, ...a);

export const getLists = (...a) => listsQ.getLists(db, ...a);
export const createList = (...a) => listsQ.createList(db, ...a);
export const deleteList = (...a) => listsQ.deleteList(db, ...a);
export const addListItem = (...a) => listsQ.addListItem(db, ...a);
export const checkListItem = (...a) => listsQ.checkListItem(db, ...a);
export const restoreListItem = (...a) => listsQ.restoreListItem(db, ...a);
