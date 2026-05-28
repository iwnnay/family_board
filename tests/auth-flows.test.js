import { describe, it, expect, beforeEach } from 'vitest';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { makeDb, makeUser, makeMember, makeSession, userCount } from './helpers.js';
import * as auth from '$lib/server/queries/auth.js';
import * as family from '$lib/server/queries/family.js';
import { sessions as sessionsTable, family as familyTable, invite_codes as inviteCodesTable } from '$lib/server/schema/sqlite.js';
import { parseUtc } from '$lib/time.js';

// ---------------------------------------------------------------------------
// Login rate limiting & lockout
// ---------------------------------------------------------------------------

describe('login rate limiting & lockout', () => {
	let db;
	let user;

	beforeEach(async () => {
		db = makeDb();
		({ user } = await makeUser(db, { username: 'alice', password: 'password123' }));
	});

	it('5 failed login attempts trigger lockout', async () => {
		for (let i = 0; i < 5; i++) {
			await auth.incrementFailedLogins(db, user.id);
		}
		const updated = await auth.getUserById(db, user.id);
		expect(updated.failed_login_attempts).toBe(5);
		expect(updated.locked_until).not.toBeNull();

		// locked_until should be ~15 minutes in the future
		const lockedUntil = parseUtc(updated.locked_until);
		const diffMs = lockedUntil.getTime() - Date.now();
		// Allow generous bounds (between 14 and 16 minutes)
		expect(diffMs).toBeGreaterThan(14 * 60 * 1000);
		expect(diffMs).toBeLessThan(16 * 60 * 1000);
	});

	it('locked_until is NOT set after fewer than 5 failures', async () => {
		for (let i = 0; i < 4; i++) {
			await auth.incrementFailedLogins(db, user.id);
		}
		const updated = await auth.getUserById(db, user.id);
		expect(updated.failed_login_attempts).toBe(4);
		expect(updated.locked_until).toBeNull();
	});

	it('resetFailedLogins clears attempts and locked_until', async () => {
		for (let i = 0; i < 5; i++) {
			await auth.incrementFailedLogins(db, user.id);
		}
		// Confirm lockout state set
		let updated = await auth.getUserById(db, user.id);
		expect(updated.locked_until).not.toBeNull();

		await auth.resetFailedLogins(db, user.id);

		updated = await auth.getUserById(db, user.id);
		expect(updated.failed_login_attempts).toBe(0);
		expect(updated.locked_until).toBeNull();
	});

	it('argon2 hash verifies correctly against the right password', async () => {
		const stored = await auth.getUserByUsername(db, 'alice');
		expect(await verify(stored.password_hash, 'password123')).toBe(true);
		expect(await verify(stored.password_hash, 'wrong-password')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Session expiry
// ---------------------------------------------------------------------------

describe('session expiry', () => {
	let db;
	let user;

	beforeEach(async () => {
		db = makeDb();
		({ user } = await makeUser(db, { username: 'bob' }));
	});

	it('a freshly created session is valid immediately', async () => {
		const sessionId = await makeSession(db, user.id);
		const result = await auth.getSession(db, sessionId);
		expect(result).not.toBeNull();
		expect(result.user.id).toBe(user.id);
		expect(result.session.id).toBe(sessionId);
	});

	it('expired session returns null from getSession', async () => {
		const sessionId = await makeSession(db, user.id);
		await db.update(sessionsTable).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(sessionsTable.id, sessionId));

		const result = await auth.getSession(db, sessionId);
		expect(result).toBeNull();
	});

	it('deleteSession removes a session', async () => {
		const sessionId = await makeSession(db, user.id);
		await auth.deleteSession(db, sessionId);
		const result = await auth.getSession(db, sessionId);
		expect(result).toBeNull();
	});

	it('deleteUserSessions removes all sessions for a user', async () => {
		const s1 = await makeSession(db, user.id);
		const s2 = await makeSession(db, user.id);
		const s3 = await makeSession(db, user.id);

		await auth.deleteUserSessions(db, user.id);

		expect(await auth.getSession(db, s1)).toBeNull();
		expect(await auth.getSession(db, s2)).toBeNull();
		expect(await auth.getSession(db, s3)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Invite codes
// ---------------------------------------------------------------------------

describe('invite codes', () => {
	let db;
	let admin;

	beforeEach(async () => {
		db = makeDb();
		({ user: admin } = await makeUser(db, { username: 'admin', isAdmin: true }));
	});

	it('a fresh invite code is returned by getInviteCode', async () => {
		const invite = await auth.createInviteCode(db, admin.id);
		const found = await auth.getInviteCode(db, invite.code);
		expect(found).toBeDefined();
		expect(found.id).toBe(invite.id);
	});

	it('once marked used, getInviteCode returns undefined', async () => {
		const invite = await auth.createInviteCode(db, admin.id);
		const { user: newUser } = await makeUser(db, { username: 'newbie' });
		await auth.markInviteUsed(db, invite.id, newUser.id);

		const found = await auth.getInviteCode(db, invite.code);
		expect(found).toBeUndefined();
	});

	it('expired invite codes are filtered out by getInviteCode', async () => {
		const invite = await auth.createInviteCode(db, admin.id);
		await db.update(inviteCodesTable).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(inviteCodesTable.id, invite.id));

		const found = await auth.getInviteCode(db, invite.code);
		expect(found).toBeUndefined();
	});

	it('getActiveInvites filters out used and expired invites', async () => {
		const active = await auth.createInviteCode(db, admin.id);
		const used = await auth.createInviteCode(db, admin.id);
		const expired = await auth.createInviteCode(db, admin.id);

		const { user: redeemer } = await makeUser(db, { username: 'redeemer' });
		await auth.markInviteUsed(db, used.id, redeemer.id);

		await db.update(inviteCodesTable).set({ expires_at: '2020-01-01 00:00:00' }).where(eq(inviteCodesTable.id, expired.id));

		const activeInvites = await auth.getActiveInvites(db);
		const ids = activeInvites.map((i) => i.id);
		expect(ids).toContain(active.id);
		expect(ids).not.toContain(used.id);
		expect(ids).not.toContain(expired.id);
	});
});

// ---------------------------------------------------------------------------
// First-user setup flow
// ---------------------------------------------------------------------------

describe('first-user setup flow', () => {
	let db;

	beforeEach(() => {
		db = makeDb();
	});

	it('hasAnyUsers returns false on empty db', async () => {
		expect(await auth.hasAnyUsers(db)).toBe(false);
	});

	it('hasAnyUsers returns true after creating the first user', async () => {
		await makeUser(db, { username: 'first' });
		expect(await auth.hasAnyUsers(db)).toBe(true);
		expect(await userCount(db)).toBe(1);
	});

	it('auto-linking: first user creation can link pre-existing family member', async () => {
		// Pre-existing family member with no user_id
		await makeMember(db, 'Alice', 'red');
		let [member] = await db.select().from(familyTable).where(eq(familyTable.name, 'Alice'));
		expect(member.user_id).toBeNull();

		// Create first user
		const passwordHash = await hash('password123');
		const newUser = await auth.createUser(db, {
			username: 'alice',
			passwordHash,
			isAdmin: true
		});

		// Auto-link existing family members to the first user (mirrors setup flow)
		const existing = await family.getFamilyMembers(db);
		for (const m of existing) {
			await auth.linkFamilyMemberToUser(db, m.id, newUser.id);
		}

		[member] = await db.select().from(familyTable).where(eq(familyTable.name, 'Alice'));
		expect(member.user_id).toBe(newUser.id);
	});
});

// ---------------------------------------------------------------------------
// Invite redemption integration
// ---------------------------------------------------------------------------

describe('invite redemption integration', () => {
	let db;
	let admin;

	beforeEach(async () => {
		db = makeDb();
		({ user: admin } = await makeUser(db, { username: 'admin', isAdmin: true }));
	});

	it('redeeming an invite deactivates it for the next caller', async () => {
		const invite = await auth.createInviteCode(db, admin.id);

		// New user is created via invite and the code is consumed
		const passwordHash = await hash('password123');
		const newUser = await auth.createUser(db, {
			username: 'newbie',
			passwordHash,
			isAdmin: false
		});
		await auth.markInviteUsed(db, invite.id, newUser.id);

		// Subsequent attempts to use the same code should fail
		expect(await auth.getInviteCode(db, invite.code)).toBeUndefined();
		const activeInvites = await auth.getActiveInvites(db);
		expect(activeInvites.map((i) => i.id)).not.toContain(invite.id);
	});

	it('a user created via invite is NOT admin', async () => {
		const invite = await auth.createInviteCode(db, admin.id);
		const passwordHash = await hash('password123');
		const newUser = await auth.createUser(db, {
			username: 'newbie',
			passwordHash,
			isAdmin: false
		});
		await auth.markInviteUsed(db, invite.id, newUser.id);

		const fetched = await auth.getUserById(db, newUser.id);
		expect(fetched.is_admin).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Password change integration
// ---------------------------------------------------------------------------

describe('password change integration', () => {
	let db;
	let user;

	beforeEach(async () => {
		db = makeDb();
		({ user } = await makeUser(db, { username: 'carol', password: 'oldpassword' }));
	});

	it('updating password + deleting sessions invalidates the old session', async () => {
		const oldSession = await makeSession(db, user.id);
		expect(await auth.getSession(db, oldSession)).not.toBeNull();

		const newHash = await hash('newpassword');
		await auth.updatePassword(db, user.id, newHash);
		await auth.deleteUserSessions(db, user.id);

		expect(await auth.getSession(db, oldSession)).toBeNull();
	});

	it('after password change, new password verifies but old does not', async () => {
		const newHash = await hash('newpassword');
		await auth.updatePassword(db, user.id, newHash);

		const fetched = await auth.getUserByUsername(db, 'carol');
		expect(await verify(fetched.password_hash, 'newpassword')).toBe(true);
		expect(await verify(fetched.password_hash, 'oldpassword')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Admin deletion
// ---------------------------------------------------------------------------

describe('admin deletion', () => {
	let db;

	beforeEach(() => {
		db = makeDb();
	});

	it('deleteUser cascades sessions for that user', async () => {
		const { user } = await makeUser(db, { username: 'target' });
		const sessionId = await makeSession(db, user.id);
		expect(await auth.getSession(db, sessionId)).not.toBeNull();

		await auth.deleteUser(db, user.id);

		expect(await auth.getSession(db, sessionId)).toBeNull();
		expect(await auth.getUserById(db, user.id)).toBeUndefined();
	});

	it('deleteUser sets family.user_id = null but keeps the family member row', async () => {
		const { user, member } = await makeUser(db, {
			username: 'target',
			name: 'Target Person'
		});
		expect(member).not.toBeNull();
		// Confirm link was established
		let [row] = await db.select().from(familyTable).where(eq(familyTable.id, member.id));
		expect(row.user_id).toBe(user.id);

		await auth.deleteUser(db, user.id);

		[row] = await db.select().from(familyTable).where(eq(familyTable.id, member.id));
		expect(row).toBeDefined();
		expect(row.user_id).toBeNull();
		expect(row.name).toBe('Target Person');
	});

	it('deleting one user does not affect another user’s sessions', async () => {
		const { user: u1 } = await makeUser(db, { username: 'u1' });
		const { user: u2 } = await makeUser(db, { username: 'u2' });
		const s1 = await makeSession(db, u1.id);
		const s2 = await makeSession(db, u2.id);

		await auth.deleteUser(db, u1.id);

		expect(await auth.getSession(db, s1)).toBeNull();
		expect(await auth.getSession(db, s2)).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Self-deletion protection (enforced at route layer — verify underlying delete works)
// ---------------------------------------------------------------------------

describe('underlying delete works (self-delete protection enforced in route)', () => {
	it('deleteUser successfully removes any given user from the database', async () => {
		const db = makeDb();
		const { user: admin } = await makeUser(db, { username: 'admin', isAdmin: true });
		const { user: other } = await makeUser(db, { username: 'other' });

		expect(await userCount(db)).toBe(2);

		// The route guards against admin deleting themselves; the query itself does not.
		// Confirm the query layer happily deletes any user when called.
		await auth.deleteUser(db, other.id);
		expect(await userCount(db)).toBe(1);
		expect(await auth.getUserById(db, other.id)).toBeUndefined();
		expect(await auth.getUserById(db, admin.id)).toBeDefined();
	});
});
