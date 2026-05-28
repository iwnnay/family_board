import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeDb, makeUser, makeMember, makeSession } from '../helpers.js';
import { sessions, invite_codes } from '$lib/server/schema/sqlite.js';
import { parseUtc } from '$lib/time.js';
import {
	hasAnyUsers,
	createUser,
	getUserByUsername,
	getUserById,
	getAllUsers,
	deleteUser,
	incrementFailedLogins,
	resetFailedLogins,
	createSession,
	getSession,
	deleteSession,
	deleteUserSessions,
	deleteExpiredSessions,
	createInviteCode,
	getInviteCode,
	markInviteUsed,
	getActiveInvites,
	getUserFamilyMember,
	linkFamilyMemberToUser
} from '$lib/server/queries/auth.js';

describe('hasAnyUsers', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns false when no users exist', async () => {
		expect(await hasAnyUsers(db)).toBe(false);
	});

	it('returns true after a user is created', async () => {
		await makeUser(db, { username: 'alice' });
		expect(await hasAnyUsers(db)).toBe(true);
	});
});

describe('createUser', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the inserted row with id and username', async () => {
		const row = await createUser(db, {
			username: 'alice',
			passwordHash: 'hash',
			isAdmin: false
		});
		expect(row.id).toBeTypeOf('number');
		expect(row.username).toBe('alice');
	});

	it('sets is_admin to 1 when isAdmin is true', async () => {
		const row = await createUser(db, {
			username: 'admin',
			passwordHash: 'hash',
			isAdmin: true
		});
		expect(row.is_admin).toBe(1);
	});

	it('sets is_admin to 0 when isAdmin is false', async () => {
		const row = await createUser(db, {
			username: 'plain',
			passwordHash: 'hash',
			isAdmin: false
		});
		expect(row.is_admin).toBe(0);
	});
});

describe('getUserByUsername', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the user when found', async () => {
		await makeUser(db, { username: 'alice' });
		const row = await getUserByUsername(db, 'alice');
		expect(row.username).toBe('alice');
	});

	it('returns undefined when not found', async () => {
		const row = await getUserByUsername(db, 'nobody');
		expect(row).toBeUndefined();
	});
});

describe('getUserById', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the user when found', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const row = await getUserById(db, user.id);
		expect(row.username).toBe('alice');
	});

	it('returns undefined when id does not match', async () => {
		const row = await getUserById(db, 9999);
		expect(row).toBeUndefined();
	});
});

describe('getAllUsers', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns an empty array when no users exist', async () => {
		const rows = await getAllUsers(db);
		expect(rows).toEqual([]);
	});

	it('returns users sorted by username ascending', async () => {
		await makeUser(db, { username: 'charlie' });
		await makeUser(db, { username: 'alice' });
		await makeUser(db, { username: 'bob' });
		const rows = await getAllUsers(db);
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.username)).toEqual(['alice', 'bob', 'charlie']);
	});
});

describe('deleteUser', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('removes the user row', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		await deleteUser(db, user.id);
		expect(await getUserById(db, user.id)).toBeUndefined();
	});

	it('deletes all sessions belonging to the user', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		await makeSession(db, user.id);
		await makeSession(db, user.id);
		await deleteUser(db, user.id);
		const remaining = await db.select().from(sessions).where(eq(sessions.user_id, user.id));
		expect(remaining).toHaveLength(0);
	});

	it('sets family.user_id to null for any linked members', async () => {
		const { user, member } = await makeUser(db, { username: 'alice', name: 'Alice' });
		expect(member).not.toBeNull();
		await deleteUser(db, user.id);
		const linked = await getUserFamilyMember(db, user.id);
		expect(linked).toBeUndefined();
	});
});

describe('incrementFailedLogins', () => {
	let db;
	let userId;

	beforeEach(async () => {
		db = makeDb();
		const { user } = await makeUser(db, { username: 'alice' });
		userId = user.id;
	});

	it('increments the counter by 1', async () => {
		await incrementFailedLogins(db, userId);
		const user = await getUserById(db, userId);
		expect(user.failed_login_attempts).toBe(1);
	});

	it('does not set locked_until before the 5th attempt', async () => {
		for (let i = 0; i < 4; i++) {
			await incrementFailedLogins(db, userId);
		}
		const user = await getUserById(db, userId);
		expect(user.failed_login_attempts).toBe(4);
		expect(user.locked_until).toBeNull();
	});

	it('sets locked_until on the 5th attempt', async () => {
		for (let i = 0; i < 5; i++) {
			await incrementFailedLogins(db, userId);
		}
		const user = await getUserById(db, userId);
		expect(user.failed_login_attempts).toBe(5);
		expect(user.locked_until).not.toBeNull();
	});
});

describe('resetFailedLogins', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('clears the counter and locked_until', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		for (let i = 0; i < 5; i++) {
			await incrementFailedLogins(db, user.id);
		}
		await resetFailedLogins(db, user.id);
		const row = await getUserById(db, user.id);
		expect(row.failed_login_attempts).toBe(0);
		expect(row.locked_until).toBeNull();
	});
});

describe('createSession', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns a 64-character hex id', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const id = await createSession(db, user.id);
		expect(id).toMatch(/^[a-f0-9]{64}$/);
	});

	it('sets the expiry approximately 30 days in the future', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const id = await createSession(db, user.id);
		const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
		const expires = parseUtc(row.expires_at).getTime();
		const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
		// within a minute window
		expect(Math.abs(expires - expected)).toBeLessThan(60 * 1000);
	});
});

describe('getSession', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns session and user when the session is valid', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const id = await createSession(db, user.id);
		const result = await getSession(db, id);
		expect(result.session.id).toBe(id);
		expect(result.user.username).toBe('alice');
	});

	it('returns null for an unknown session id', async () => {
		const result = await getSession(db, 'does-not-exist');
		expect(result).toBeNull();
	});

	it('returns null when the session has expired', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const id = await createSession(db, user.id);
		await db.update(sessions).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(sessions.id, id));
		const result = await getSession(db, id);
		expect(result).toBeNull();
	});
});

describe('deleteSession', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('removes the specified session', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const id = await createSession(db, user.id);
		await deleteSession(db, id);
		const result = await getSession(db, id);
		expect(result).toBeNull();
	});
});

describe('deleteUserSessions', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('removes every session for the given user', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		await createSession(db, user.id);
		await createSession(db, user.id);
		await deleteUserSessions(db, user.id);
		const remaining = await db.select().from(sessions).where(eq(sessions.user_id, user.id));
		expect(remaining).toHaveLength(0);
	});

	it("leaves another user's sessions intact", async () => {
		const a = await makeUser(db, { username: 'alice' });
		const b = await makeUser(db, { username: 'bob' });
		const bobSession = await createSession(db, b.user.id);
		await createSession(db, a.user.id);
		await deleteUserSessions(db, a.user.id);
		const result = await getSession(db, bobSession);
		expect(result).not.toBeNull();
	});
});

describe('deleteExpiredSessions', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('removes expired sessions but keeps valid ones', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const validId = await createSession(db, user.id);
		const expiredId = await createSession(db, user.id);
		await db.update(sessions).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(sessions.id, expiredId));

		await deleteExpiredSessions(db);

		const all = await db.select().from(sessions);
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(validId);
	});
});

describe('createInviteCode', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns a row with an 8-character hex code', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const row = await createInviteCode(db, user.id);
		expect(row.code).toMatch(/^[a-f0-9]{8}$/);
	});

	it('sets the expiry approximately 7 days in the future', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const row = await createInviteCode(db, user.id);
		const expires = parseUtc(row.expires_at).getTime();
		const expected = Date.now() + 7 * 24 * 60 * 60 * 1000;
		expect(Math.abs(expires - expected)).toBeLessThan(60 * 1000);
	});
});

describe('getInviteCode', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the row for an unused, unexpired code', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const created = await createInviteCode(db, user.id);
		const row = await getInviteCode(db, created.code);
		expect(row.id).toBe(created.id);
	});

	it('returns undefined for an unknown code', async () => {
		const row = await getInviteCode(db, 'deadbeef');
		expect(row).toBeUndefined();
	});

	it('returns undefined for a code that has been used', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const created = await createInviteCode(db, user.id);
		await markInviteUsed(db, created.id, user.id);
		const row = await getInviteCode(db, created.code);
		expect(row).toBeUndefined();
	});

	it('returns undefined for an expired code', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const created = await createInviteCode(db, user.id);
		await db.update(invite_codes).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(invite_codes.id, created.id));
		const row = await getInviteCode(db, created.code);
		expect(row).toBeUndefined();
	});
});

describe('markInviteUsed', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('sets used_by to the given user id', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const { user: bob } = await makeUser(db, { username: 'bob' });
		const created = await createInviteCode(db, user.id);
		await markInviteUsed(db, created.id, bob.id);
		const [row] = await db.select().from(invite_codes).where(eq(invite_codes.id, created.id));
		expect(row.used_by).toBe(bob.id);
	});
});

describe('getActiveInvites', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns only unused, unexpired invites', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const active = await createInviteCode(db, user.id);
		const used = await createInviteCode(db, user.id);
		const expired = await createInviteCode(db, user.id);
		await markInviteUsed(db, used.id, user.id);
		await db.update(invite_codes).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(invite_codes.id, expired.id));

		const rows = await getActiveInvites(db);
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(active.id);
	});
});

describe('getUserFamilyMember', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('returns the family row linked to the user', async () => {
		const { user, member } = await makeUser(db, { username: 'alice', name: 'Alice' });
		const row = await getUserFamilyMember(db, user.id);
		expect(row.id).toBe(member.id);
		expect(row.name).toBe('Alice');
	});

	it('returns undefined when the user has no linked member', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const row = await getUserFamilyMember(db, user.id);
		expect(row).toBeUndefined();
	});
});

describe('linkFamilyMemberToUser', () => {
	let db;

	beforeEach(async () => {
		db = makeDb();
	});

	it('sets family.user_id for the given member', async () => {
		const { user } = await makeUser(db, { username: 'alice' });
		const member = await makeMember(db, 'Alice');
		await linkFamilyMemberToUser(db, member.id, user.id);
		const linked = await getUserFamilyMember(db, user.id);
		expect(linked.id).toBe(member.id);
	});
});
