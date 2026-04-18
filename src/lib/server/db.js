import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS family (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'none',
    suggested_day TEXT
  );

  CREATE TABLE IF NOT EXISTS chores_completed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    completed_by INTEGER NOT NULL REFERENCES family(id) ON DELETE CASCADE,
    completed_at TEXT NOT NULL
  );
`;

const FREQ_ORDER = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export function isDueAgain(frequency, completedAt, now) {
	if (frequency === 'none') return false;

	switch (frequency) {
		case 'daily':
			return completedAt.toDateString() !== now.toDateString();
		case 'weekly': {
			const weekStart = new Date(now);
			weekStart.setHours(0, 0, 0, 0);
			weekStart.setDate(now.getDate() - now.getDay());
			return completedAt < weekStart;
		}
		case 'monthly':
			return (
				completedAt.getMonth() !== now.getMonth() ||
				completedAt.getFullYear() !== now.getFullYear()
			);
		case 'yearly':
			return completedAt.getFullYear() !== now.getFullYear();
		default:
			return false;
	}
}

function toSqliteTimestamp(date) {
	// SQLite datetime string in local time: "YYYY-MM-DD HH:MM:SS"
	const pad = (n) => String(n).padStart(2, '0');
	return (
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	);
}

export function createDb(sqliteDb) {
	sqliteDb.pragma('journal_mode = WAL');
	sqliteDb.pragma('foreign_keys = ON');
	sqliteDb.exec(SCHEMA);

	// Migrations
	const choresCols = sqliteDb.prepare('PRAGMA table_info(chores)').all();
	if (!choresCols.find((c) => c.name === 'image')) {
		sqliteDb.exec('ALTER TABLE chores ADD COLUMN image TEXT');
	}

	const familyCols = sqliteDb.prepare('PRAGMA table_info(family)').all();
	if (!familyCols.find((c) => c.name === 'color')) {
		sqliteDb.exec('ALTER TABLE family ADD COLUMN color TEXT');
	}

	return {
		// --- Family ---
		getFamilyMembers() {
			return sqliteDb.prepare('SELECT * FROM family ORDER BY name').all();
		},
		addFamilyMember(name, color = 'blue') {
			return sqliteDb.prepare('INSERT INTO family (name, color) VALUES (?, ?)').run(name, color);
		},
		updateFamilyMemberColor(id, color) {
			return sqliteDb.prepare('UPDATE family SET color = ? WHERE id = ?').run(color, id);
		},
		deleteFamilyMember(id) {
			return sqliteDb.prepare('DELETE FROM family WHERE id = ?').run(id);
		},

		// --- Chores ---
		getChores() {
			return sqliteDb
				.prepare(
					`SELECT * FROM chores
           ORDER BY CASE frequency
             WHEN 'none'    THEN 0
             WHEN 'daily'   THEN 1
             WHEN 'weekly'  THEN 2
             WHEN 'monthly' THEN 3
             WHEN 'yearly'  THEN 4
             ELSE 5
           END, name`
				)
				.all();
		},
		addChore(name, frequency, suggested_day, image = null) {
			return sqliteDb
				.prepare('INSERT INTO chores (name, frequency, suggested_day, image) VALUES (?, ?, ?, ?)')
				.run(name, frequency, suggested_day || null, image);
		},
		updateChore(id, name, frequency, suggested_day, image = undefined) {
			if (image === undefined) {
				return sqliteDb
					.prepare('UPDATE chores SET name = ?, frequency = ?, suggested_day = ? WHERE id = ?')
					.run(name, frequency, suggested_day || null, id);
			}
			return sqliteDb
				.prepare('UPDATE chores SET name = ?, frequency = ?, suggested_day = ?, image = ? WHERE id = ?')
				.run(name, frequency, suggested_day || null, image, id);
		},
		getChoreById(id) {
			return sqliteDb.prepare('SELECT * FROM chores WHERE id = ?').get(id) ?? null;
		},
		deleteChore(id) {
			return sqliteDb.prepare('DELETE FROM chores WHERE id = ?').run(id);
		},

		// --- Completions ---
		completeChore(chore_id, member_id, completedAt = new Date()) {
			return sqliteDb
				.prepare('INSERT INTO chores_completed (chore_id, completed_by, completed_at) VALUES (?, ?, ?)')
				.run(chore_id, member_id, toSqliteTimestamp(completedAt));
		},

		getChoresWithStatus(now = new Date()) {
			const chores = sqliteDb
				.prepare(
					`
          SELECT
            c.*,
            cc.id as completion_id,
            cc.completed_at,
            cc.completed_by,
            f.name as completed_by_name,
            f.color as completed_by_color
          FROM chores c
          LEFT JOIN (
            SELECT chore_id, MAX(completed_at) as last_completed
            FROM chores_completed
            GROUP BY chore_id
          ) latest ON c.id = latest.chore_id
          LEFT JOIN chores_completed cc
            ON cc.chore_id = c.id AND cc.completed_at = latest.last_completed
          LEFT JOIN family f ON f.id = cc.completed_by
        `
				)
				.all();

			const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
			const due = [];
			const recentlyCompleted = [];

			for (const chore of chores) {
				if (!chore.completed_at) {
					due.push({ ...chore, status: 'due' });
					continue;
				}

				const completedAt = new Date(chore.completed_at);

				if (isDueAgain(chore.frequency, completedAt, now)) {
					due.push({ ...chore, status: 'due' });
				} else if (completedAt >= twoDaysAgo) {
					recentlyCompleted.push({ ...chore, status: 'completed' });
				}
			}

			due.sort((a, b) => FREQ_ORDER.indexOf(a.frequency) - FREQ_ORDER.indexOf(b.frequency));
			return [...due, ...recentlyCompleted];
		},

		getStats(now = new Date()) {
			const mostDailyChores = sqliteDb
				.prepare(
					`
          SELECT f.name, COUNT(*) as count
          FROM chores_completed cc
          JOIN family f ON f.id = cc.completed_by
          JOIN chores c ON c.id = cc.chore_id
          WHERE c.frequency = 'daily'
          GROUP BY f.id
          ORDER BY count DESC
          LIMIT 1
        `
				)
				.get();

			const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
			const mostThisMonth = sqliteDb
				.prepare(
					`
          SELECT f.name, COUNT(*) as count
          FROM chores_completed cc
          JOIN family f ON f.id = cc.completed_by
          WHERE strftime('%Y-%m', cc.completed_at) = ?
          GROUP BY f.id
          ORDER BY count DESC
          LIMIT 1
        `
				)
				.get(monthStr);

			const dueCount = this.getChoresWithStatus(now).filter((c) => c.status === 'due').length;
			return { mostDailyChores, mostThisMonth, dueCount };
		}
	};
}

// --- Default file-based instance ---

const dbDir = join(process.cwd(), 'data');
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const _db = createDb(new Database(join(dbDir, 'family_board.db')));

export const getFamilyMembers = (...a) => _db.getFamilyMembers(...a);
export const addFamilyMember = (...a) => _db.addFamilyMember(...a);
export const updateFamilyMemberColor = (...a) => _db.updateFamilyMemberColor(...a);
export const deleteFamilyMember = (...a) => _db.deleteFamilyMember(...a);
export const getChores = (...a) => _db.getChores(...a);
export const addChore = (...a) => _db.addChore(...a);
export const updateChore = (...a) => _db.updateChore(...a);
export const getChoreById = (...a) => _db.getChoreById(...a);
export const deleteChore = (...a) => _db.deleteChore(...a);
export const completeChore = (...a) => _db.completeChore(...a);
export const getChoresWithStatus = (...a) => _db.getChoresWithStatus(...a);
export const getStats = (...a) => _db.getStats(...a);
