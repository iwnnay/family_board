import { mysqlTable, varchar, int } from 'drizzle-orm/mysql-core';

export const family = mysqlTable('family', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	color: varchar('color', { length: 50 })
});

export const chores = mysqlTable('chores', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	frequency: varchar('frequency', { length: 20 }).notNull().default('none'),
	suggested_day: varchar('suggested_day', { length: 100 }),
	image: varchar('image', { length: 255 })
});

// completed_at stored as a formatted string ('YYYY-MM-DD HH:MM:SS') in both dialects
// so categorizeChores can parse it identically with new Date(str).
export const chores_completed = mysqlTable('chores_completed', {
	id: int('id').primaryKey().autoincrement(),
	chore_id: int('chore_id')
		.notNull()
		.references(() => chores.id, { onDelete: 'cascade' }),
	completed_by: int('completed_by')
		.notNull()
		.references(() => family.id, { onDelete: 'cascade' }),
	completed_at: varchar('completed_at', { length: 30 }).notNull()
});
