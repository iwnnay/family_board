import { asc, eq } from 'drizzle-orm';
import { family } from '../schema/index.js';

export async function getFamilyMembers(db) {
	return db.select().from(family).orderBy(asc(family.name));
}

export async function addFamilyMember(db, name, color = 'blue') {
	await db.insert(family).values({ name, color });
}

export async function updateFamilyMemberColor(db, id, color) {
	await db.update(family).set({ color }).where(eq(family.id, id));
}

export async function updateFamilyMember(db, id, { name, color }) {
	await db.update(family).set({ name, color }).where(eq(family.id, id));
}

export async function deleteFamilyMember(db, id) {
	await db.delete(family).where(eq(family.id, id));
}
