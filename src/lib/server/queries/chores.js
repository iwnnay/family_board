import { asc, eq, and, max, sql } from 'drizzle-orm';
import { chores, chores_completed, family } from '../schema/index.js';
import { categorizeChores } from '../../chore-logic.js';

const BY_FREQUENCY = sql`CASE frequency
  WHEN 'none'    THEN 0
  WHEN 'daily'   THEN 1
  WHEN 'weekly'  THEN 2
  WHEN 'monthly' THEN 3
  WHEN 'yearly'  THEN 4
  ELSE 5
END`;

export async function getChores(db) {
	return db.select().from(chores).orderBy(BY_FREQUENCY, asc(chores.name));
}

export async function getChoreById(db, id) {
	const rows = await db.select().from(chores).where(eq(chores.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function addChore(db, name, frequency, suggested_day, image = null) {
	await db.insert(chores).values({ name, frequency, suggested_day: suggested_day || null, image });
}

export async function updateChore(db, id, name, frequency, suggested_day, image = undefined) {
	const values = { name, frequency, suggested_day: suggested_day || null };
	if (image !== undefined) {
		values.image = image;
	}
	await db.update(chores).set(values).where(eq(chores.id, id));
}

export async function deleteChore(db, id) {
	await db.delete(chores).where(eq(chores.id, id));
}

export async function getChoresWithStatus(db, now = new Date()) {
	// Subquery: latest completion timestamp per chore
	const latest = db
		.select({
			chore_id: chores_completed.chore_id,
			last_completed: max(chores_completed.completed_at).as('last_completed')
		})
		.from(chores_completed)
		.groupBy(chores_completed.chore_id)
		.as('latest');

	const rows = await db
		.select({
			id: chores.id,
			name: chores.name,
			frequency: chores.frequency,
			suggested_day: chores.suggested_day,
			image: chores.image,
			completed_at: chores_completed.completed_at,
			completed_by: chores_completed.completed_by,
			completed_by_name: family.name,
			completed_by_color: family.color
		})
		.from(chores)
		.leftJoin(latest, eq(chores.id, latest.chore_id))
		.leftJoin(chores_completed, and(eq(chores_completed.chore_id, chores.id), eq(chores_completed.completed_at, latest.last_completed)))
		.leftJoin(family, eq(family.id, chores_completed.completed_by));

	return categorizeChores(rows, now);
}
