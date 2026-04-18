/**
 * Exports the right Drizzle table definitions based on DATABASE_URL.
 * When DATABASE_URL is absent or points to a file, SQLite is used (dev).
 * When DATABASE_URL starts with mysql:// or mariadb://, MySQL is used (prod).
 *
 * Both exports use identical JS column names so query code is dialect-agnostic.
 */

import * as sqliteSchema from './sqlite.js';
import * as mysqlSchema from './mysql.js';

const url = process.env.DATABASE_URL ?? '';
export const isMysql = url.startsWith('mysql://') || url.startsWith('mariadb://');

export const { family, chores, chores_completed, notes, note_bodies, user_pins, recent_events, locations, calendar_entries, lists, list_items } = isMysql ? mysqlSchema : sqliteSchema;
