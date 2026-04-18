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
	const dbDir = join(process.cwd(), 'data');
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
