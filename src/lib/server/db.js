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
import * as authQ from './queries/auth.js';
import { registerHealthCheck } from './health.js';

// ---------------------------------------------------------------------------
// Raw SQL used only for dev SQLite setup (avoids needing drizzle-kit push)
// ---------------------------------------------------------------------------

const SQLITE_SETUP_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    username              TEXT NOT NULL UNIQUE,
    password_hash         TEXT NOT NULL,
    is_admin              INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until          TEXT,
    created_at            TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS invite_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    used_by    INTEGER REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS family (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    color   TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
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
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    location_id     INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    start_time      TEXT NOT NULL,
    end_time        TEXT NOT NULL,
    description     TEXT,
    created_by      INTEGER REFERENCES family(id) ON DELETE SET NULL,
    all_day         INTEGER NOT NULL DEFAULT 0,
    series_id       INTEGER,
    is_series_head  INTEGER NOT NULL DEFAULT 0,
    recurrence      TEXT NOT NULL DEFAULT 'none',
    recurrence_end  TEXT,
    generated_until TEXT
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
 * Adds a column to a SQLite table only when it does not already exist, so
 * existing dev databases pick up new columns without a migration step.
 * (CREATE TABLE IF NOT EXISTS never alters an already-created table.)
 */
function ensureColumn(sqliteDb, table, column, definition) {
	const cols = sqliteDb.prepare(`PRAGMA table_info(${table})`).all();
	if (cols.some((c) => c.name === column)) {
		return;
	}
	try {
		sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	} catch (err) {
		// The PRAGMA check isn't atomic across processes (parallel test workers
		// share the dev db file); a concurrent add is harmless.
		if (!String(err?.message).includes('duplicate column name')) {
			throw err;
		}
	}
}

/**
 * Creates a Drizzle instance from a raw better-sqlite3 Database.
 * Runs CREATE TABLE IF NOT EXISTS so the dev database is always ready.
 * Pass `new Database(':memory:')` in tests for an isolated in-memory database.
 */
export function createTestDb(sqliteDb) {
	sqliteDb.pragma('journal_mode = WAL');
	sqliteDb.pragma('foreign_keys = ON');
	sqliteDb.exec(SQLITE_SETUP_SQL);
	// Backfill columns added after a database was first created.
	ensureColumn(sqliteDb, 'calendar_entries', 'all_day', 'INTEGER NOT NULL DEFAULT 0');
	ensureColumn(sqliteDb, 'calendar_entries', 'series_id', 'INTEGER');
	ensureColumn(sqliteDb, 'calendar_entries', 'is_series_head', 'INTEGER NOT NULL DEFAULT 0');
	ensureColumn(sqliteDb, 'calendar_entries', 'recurrence', "TEXT NOT NULL DEFAULT 'none'");
	ensureColumn(sqliteDb, 'calendar_entries', 'recurrence_end', 'TEXT');
	ensureColumn(sqliteDb, 'calendar_entries', 'generated_until', 'TEXT');
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

registerHealthCheck('db', async () => {
	// A successful query confirms the connection + schema are usable
	await db.select().from(sqliteSchema.family).limit(1);
	return { dialect: isMysql ? 'mysql' : 'sqlite' };
});

// Re-export every query function bound to the app instance so that
// route files keep their existing import style:
//   import { getChores, addChore } from '$lib/server/db';

export const getFamilyMembers = () => familyQ.getFamilyMembers(db);
export const addFamilyMember = (...a) => familyQ.addFamilyMember(db, ...a);
export const updateFamilyMemberColor = (...a) => familyQ.updateFamilyMemberColor(db, ...a);
export const updateFamilyMember = (...a) => familyQ.updateFamilyMember(db, ...a);
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
export const healCalendarSeries = (...a) => calendarQ.healCalendarSeries(db, ...a);

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

export const hasAnyUsers = () => authQ.hasAnyUsers(db);
export const createUser = (...a) => authQ.createUser(db, ...a);
export const getUserByUsername = (...a) => authQ.getUserByUsername(db, ...a);
export const getUserById = (...a) => authQ.getUserById(db, ...a);
export const getAllUsers = () => authQ.getAllUsers(db);
export const deleteUser = (...a) => authQ.deleteUser(db, ...a);
export const updatePassword = (...a) => authQ.updatePassword(db, ...a);
export const incrementFailedLogins = (...a) => authQ.incrementFailedLogins(db, ...a);
export const resetFailedLogins = (...a) => authQ.resetFailedLogins(db, ...a);
export const createSession = (...a) => authQ.createSession(db, ...a);
export const getSession = (...a) => authQ.getSession(db, ...a);
export const deleteSession = (...a) => authQ.deleteSession(db, ...a);
export const deleteExpiredSessions = () => authQ.deleteExpiredSessions(db);
export const deleteUserSessions = (...a) => authQ.deleteUserSessions(db, ...a);
export const createInviteCode = (...a) => authQ.createInviteCode(db, ...a);
export const getInviteCode = (...a) => authQ.getInviteCode(db, ...a);
export const markInviteUsed = (...a) => authQ.markInviteUsed(db, ...a);
export const getActiveInvites = () => authQ.getActiveInvites(db);
export const getUserFamilyMember = (...a) => authQ.getUserFamilyMember(db, ...a);
export const linkFamilyMemberToUser = (...a) => authQ.linkFamilyMemberToUser(db, ...a);
