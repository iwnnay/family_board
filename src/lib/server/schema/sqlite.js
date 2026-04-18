import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const family = sqliteTable('family', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	color: text('color')
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
