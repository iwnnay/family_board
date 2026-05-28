import Database from 'better-sqlite3';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { createTestDb } from '$lib/server/db.js';
import { family as familyTable, chores as choresTable, users as usersTable } from '$lib/server/schema/sqlite.js';
import * as authQ from '$lib/server/queries/auth.js';
import * as familyQ from '$lib/server/queries/family.js';
import * as choresQ from '$lib/server/queries/chores.js';

/** Build a fresh in-memory database with schema applied. */
export function makeDb() {
	return createTestDb(new Database(':memory:'));
}

/**
 * Create a user, optionally with a linked family member.
 * If `name` is provided, also creates a family member and links them.
 */
export async function makeUser(db, { username = 'alice', password = 'password123', isAdmin = false, name = null, color = 'blue' } = {}) {
	const passwordHash = await hash(password);
	const user = await authQ.createUser(db, { username, passwordHash, isAdmin });

	let member = null;
	if (name) {
		await familyQ.addFamilyMember(db, name, color);
		const [row] = await db.select().from(familyTable).where(eq(familyTable.name, name));
		member = row;
		await authQ.linkFamilyMemberToUser(db, member.id, user.id);
	}

	return { user, member, password };
}

/** Insert a family member and return the row. */
export async function makeMember(db, name, color = 'blue') {
	await familyQ.addFamilyMember(db, name, color);
	const [row] = await db.select().from(familyTable).where(eq(familyTable.name, name));
	return row;
}

/** Insert a chore and return the id. */
export async function makeChore(db, name, frequency = 'daily') {
	await choresQ.addChore(db, name, frequency, null, null);
	const [row] = await db.select({ id: choresTable.id }).from(choresTable).where(eq(choresTable.name, name));
	return row.id;
}

/** Create a session for a user and return the session id. */
export async function makeSession(db, userId) {
	return authQ.createSession(db, userId);
}

/** Get current user count (handy assertion helper). */
export async function userCount(db) {
	return (await db.select().from(usersTable)).length;
}

/**
 * Build a mock `event.locals` object for route-action tests.
 * Pass `user: null` for unauthenticated.
 */
export function mockLocals({ user = null, session = null, currentMember = null } = {}) {
	return { user, session, currentMember };
}

/**
 * Build a mock `cookies` object that records set/delete calls. Useful for
 * verifying that route actions correctly set or clear session cookies.
 */
export function mockCookies(initial = {}) {
	const store = new Map(Object.entries(initial));
	const calls = { set: [], delete: [] };
	return {
		get: (key) => store.get(key),
		set: (key, value, options) => {
			store.set(key, value);
			calls.set.push({ key, value, options });
		},
		delete: (key, options) => {
			store.delete(key);
			calls.delete.push({ key, options });
		},
		_calls: calls,
		_store: store
	};
}

/**
 * Build a mock request whose `formData()` returns the given fields.
 */
export function mockRequest(fields = {}) {
	const form = new FormData();
	for (const [k, v] of Object.entries(fields)) {
		if (v !== undefined && v !== null) {
			form.set(k, String(v));
		}
	}
	return {
		formData: async () => form
	};
}
