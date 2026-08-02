import { mysqlTable, varchar, int } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
	id: int('id').primaryKey().autoincrement(),
	username: varchar('username', { length: 100 }).notNull().unique(),
	password_hash: varchar('password_hash', { length: 255 }).notNull(),
	is_admin: int('is_admin').notNull().default(0),
	failed_login_attempts: int('failed_login_attempts').notNull().default(0),
	locked_until: varchar('locked_until', { length: 30 }),
	created_at: varchar('created_at', { length: 30 }).notNull()
});

export const sessions = mysqlTable('sessions', {
	id: varchar('id', { length: 64 }).primaryKey(),
	user_id: int('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires_at: varchar('expires_at', { length: 30 }).notNull(),
	created_at: varchar('created_at', { length: 30 }).notNull()
});

export const invite_codes = mysqlTable('invite_codes', {
	id: int('id').primaryKey().autoincrement(),
	code: varchar('code', { length: 20 }).notNull().unique(),
	created_by: int('created_by')
		.notNull()
		.references(() => users.id),
	used_by: int('used_by').references(() => users.id),
	expires_at: varchar('expires_at', { length: 30 }).notNull(),
	created_at: varchar('created_at', { length: 30 }).notNull()
});

export const family = mysqlTable('family', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	color: varchar('color', { length: 50 }),
	user_id: int('user_id').references(() => users.id, { onDelete: 'set null' })
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

export const locations = mysqlTable('locations', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	address: varchar('address', { length: 500 }),
	is_deleted: int('is_deleted').notNull().default(0)
});

export const calendar_entries = mysqlTable('calendar_entries', {
	id: int('id').primaryKey().autoincrement(),
	title: varchar('title', { length: 255 }).notNull(),
	location_id: int('location_id').references(() => locations.id, { onDelete: 'set null' }),
	start_time: varchar('start_time', { length: 30 }).notNull(),
	end_time: varchar('end_time', { length: 30 }).notNull(),
	description: varchar('description', { length: 2000 }),
	created_by: int('created_by').references(() => family.id, { onDelete: 'set null' }),
	// 1 = all-day event (no time-of-day; date stored as a floating 'YYYY-MM-DD 00:00:00')
	all_day: int('all_day').notNull().default(0),
	// Recurring events are materialised as one row per occurrence. All rows of a
	// series share series_id (null = standalone one-off). The earliest occurrence
	// is the head (is_series_head = 1) and carries generated_until.
	series_id: int('series_id'),
	is_series_head: int('is_series_head').notNull().default(0),
	// 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' (denormalised onto every occurrence)
	recurrence: varchar('recurrence', { length: 20 }).notNull().default('none'),
	// inclusive last date the series may produce an occurrence ('YYYY-MM-DD'); null = forever
	recurrence_end: varchar('recurrence_end', { length: 30 }),
	// start_time through which this series has been materialised (head row only)
	generated_until: varchar('generated_until', { length: 30 })
});

export const lists = mysqlTable('lists', {
	id: int('id').primaryKey().autoincrement(),
	title: varchar('title', { length: 255 }).notNull(),
	created_by: int('created_by').references(() => family.id, { onDelete: 'set null' }),
	created_at: varchar('created_at', { length: 30 }).notNull(),
	updated_at: varchar('updated_at', { length: 30 }).notNull()
});

export const list_items = mysqlTable('list_items', {
	id: int('id').primaryKey().autoincrement(),
	list_id: int('list_id')
		.notNull()
		.references(() => lists.id, { onDelete: 'cascade' }),
	item: varchar('item', { length: 500 }).notNull(),
	completed_at: varchar('completed_at', { length: 30 }),
	// Floating 'YYYY-MM-DD' (no time-of-day) so a due date never shifts timezone.
	due_date: varchar('due_date', { length: 10 }),
	// 'high' | 'medium' | 'low' | 'none'
	priority: varchar('priority', { length: 10 }).notNull().default('none'),
	notes: varchar('notes', { length: 2000 }),
	assigned_to: int('assigned_to').references(() => family.id, { onDelete: 'set null' }),
	created_by: int('created_by').references(() => family.id, { onDelete: 'set null' }),
	// Filename under static/store/images/lists (see server/images.js)
	image: varchar('image', { length: 255 }),
	// Nullable so rows created before this column existed stay valid.
	created_at: varchar('created_at', { length: 30 })
});

export const list_item_steps = mysqlTable('list_item_steps', {
	id: int('id').primaryKey().autoincrement(),
	item_id: int('item_id')
		.notNull()
		.references(() => list_items.id, { onDelete: 'cascade' }),
	step: varchar('step', { length: 500 }).notNull(),
	completed_at: varchar('completed_at', { length: 30 }),
	sort_order: int('sort_order').notNull().default(0)
});
