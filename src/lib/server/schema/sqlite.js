import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	is_admin: integer('is_admin').notNull().default(0),
	failed_login_attempts: integer('failed_login_attempts').notNull().default(0),
	locked_until: text('locked_until'),
	created_at: text('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	user_id: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires_at: text('expires_at').notNull(),
	created_at: text('created_at').notNull()
});

export const invite_codes = sqliteTable('invite_codes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	code: text('code').notNull().unique(),
	created_by: integer('created_by')
		.notNull()
		.references(() => users.id),
	used_by: integer('used_by').references(() => users.id),
	expires_at: text('expires_at').notNull(),
	created_at: text('created_at').notNull()
});

export const family = sqliteTable('family', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	color: text('color'),
	user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' })
});

export const chores = sqliteTable('chores', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	frequency: text('frequency').notNull().default('none'),
	suggested_day: text('suggested_day'),
	image: text('image')
});

export const chores_completed = sqliteTable('chores_completed', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	chore_id: integer('chore_id')
		.notNull()
		.references(() => chores.id, { onDelete: 'cascade' }),
	completed_by: integer('completed_by')
		.notNull()
		.references(() => family.id, { onDelete: 'cascade' }),
	completed_at: text('completed_at').notNull()
});

export const notes = sqliteTable('notes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title'),
	summary: text('summary'),
	color: text('color'),
	created_by: integer('created_by').references(() => family.id, { onDelete: 'set null' }),
	created_at: text('created_at').notNull(),
	updated_at: text('updated_at').notNull()
});

export const note_bodies = sqliteTable('note_bodies', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	note_id: integer('note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	subtitle: text('subtitle'),
	body: text('body'),
	sort_order: integer('sort_order').notNull().default(0)
});

export const user_pins = sqliteTable('user_pins', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	user_id: integer('user_id')
		.notNull()
		.references(() => family.id, { onDelete: 'cascade' }),
	rel_id: integer('rel_id').notNull(),
	rel_type: text('rel_type').notNull(),
	is_global: integer('is_global').notNull().default(0)
});

export const recent_events = sqliteTable('recent_events', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	type: text('type').notNull(),
	message: text('message').notNull(),
	rel_id: integer('rel_id').notNull(),
	rel_type: text('rel_type').notNull(),
	action: text('action').notNull(),
	created_at: text('created_at').notNull()
});

export const locations = sqliteTable('locations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	address: text('address'),
	is_deleted: integer('is_deleted').notNull().default(0)
});

export const calendar_entries = sqliteTable('calendar_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	location_id: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
	start_time: text('start_time').notNull(),
	end_time: text('end_time').notNull(),
	description: text('description'),
	created_by: integer('created_by').references(() => family.id, { onDelete: 'set null' })
});

export const lists = sqliteTable('lists', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	created_by: integer('created_by').references(() => family.id, { onDelete: 'set null' }),
	created_at: text('created_at').notNull(),
	updated_at: text('updated_at').notNull()
});

export const list_items = sqliteTable('list_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	list_id: integer('list_id')
		.notNull()
		.references(() => lists.id, { onDelete: 'cascade' }),
	item: text('item').notNull(),
	completed_at: text('completed_at')
});
