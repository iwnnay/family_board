import { eq, sql } from 'drizzle-orm';
import { chores_completed, chores, family } from '../schema/index.js';
import { isMysql } from '../schema/index.js';
import { getChoresWithStatus } from './chores.js';

function toTimestamp(date) {
	const pad = (n) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Date truncation to YYYY-MM differs between SQLite and MySQL
function monthFilter(col, monthStr) {
	if (isMysql) {
		return sql`DATE_FORMAT(${col}, '%Y-%m') = ${monthStr}`;
	}
	return sql`strftime('%Y-%m', ${col}) = ${monthStr}`;
}

export async function completeChore(db, chore_id, member_id, completedAt = new Date()) {
	await db.insert(chores_completed).values({ chore_id, completed_by: member_id, completed_at: toTimestamp(completedAt) });
}

export async function getStats(db, now = new Date()) {
	const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	const [mostDailyChores = null] = await db
		.select({ name: family.name, count: sql`count(*)`.mapWith(Number) })
		.from(chores_completed)
		.innerJoin(family, eq(family.id, chores_completed.completed_by))
		.innerJoin(chores, eq(chores.id, chores_completed.chore_id))
		.where(eq(chores.frequency, 'daily'))
		.groupBy(family.id)
		.orderBy(sql`count(*) desc`)
		.limit(1);

	const [mostThisMonth = null] = await db
		.select({ name: family.name, count: sql`count(*)`.mapWith(Number) })
		.from(chores_completed)
		.innerJoin(family, eq(family.id, chores_completed.completed_by))
		.where(monthFilter(chores_completed.completed_at, monthStr))
		.groupBy(family.id)
		.orderBy(sql`count(*) desc`)
		.limit(1);

	const allChores = await getChoresWithStatus(db, now);
	const dueCount = allChores.filter((c) => c.status === 'due').length;

	return { mostDailyChores, mostThisMonth, dueCount };
}
