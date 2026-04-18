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

export const notes = mysqlTable('notes', {
	id: int('id').primaryKey().autoincrement(),
	title: varchar('title', { length: 255 }),
	summary: varchar('summary', { length: 1000 }),
	color: varchar('color', { length: 50 }),
	created_by: int('created_by').references(() => family.id, { onDelete: 'set null' }),
	created_at: varchar('created_at', { length: 30 }).notNull(),
	updated_at: varchar('updated_at', { length: 30 }).notNull()
});

export const note_bodies = mysqlTable('note_bodies', {
	id: int('id').primaryKey().autoincrement(),
	note_id: int('note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	subtitle: varchar('subtitle', { length: 255 }),
	body: varchar('body', { length: 10000 }),
	sort_order: int('sort_order').notNull().default(0)
});

export const user_pins = mysqlTable('user_pins', {
	id: int('id').primaryKey().autoincrement(),
	user_id: int('user_id')
		.notNull()
		.references(() => family.id, { onDelete: 'cascade' }),
	rel_id: int('rel_id').notNull(),
	rel_type: varchar('rel_type', { length: 50 }).notNull(),
	is_global: int('is_global').notNull().default(0)
});

export const recent_events = mysqlTable('recent_events', {
	id: int('id').primaryKey().autoincrement(),
	type: varchar('type', { length: 50 }).notNull(),
	message: varchar('message', { length: 500 }).notNull(),
	rel_id: int('rel_id').notNull(),
	rel_type: varchar('rel_type', { length: 50 }).notNull(),
	action: varchar('action', { length: 50 }).notNull(),
	created_at: varchar('created_at', { length: 30 }).notNull()
});
