import crypto from 'node:crypto';
import { eq, and, isNull, gt, count } from 'drizzle-orm';
import { users, sessions, invite_codes, family } from '../schema/index.js';
import { toUtcString } from '$lib/time.js';

// ── Users ────────────────────────────────────────────────────────────────────

export async function hasAnyUsers(db) {
	const [row] = await db.select({ value: count() }).from(users);
	return row.value > 0;
}

export async function createUser(db, { username, passwordHash, isAdmin }) {
	const now = toUtcString(new Date());
	const [row] = await db
		.insert(users)
		.values({
			username,
			password_hash: passwordHash,
			is_admin: isAdmin ? 1 : 0,
			created_at: now
		})
		.returning();
	return row;
}

export async function getUserByUsername(db, username) {
	const [row] = await db.select().from(users).where(eq(users.username, username));
	return row;
}

export async function getUserById(db, id) {
	const [row] = await db.select().from(users).where(eq(users.id, id));
	return row;
}

export async function getAllUsers(db) {
	return db
		.select({
			id: users.id,
			username: users.username,
			is_admin: users.is_admin,
			created_at: users.created_at
		})
		.from(users)
		.orderBy(users.username);
}

export async function deleteUser(db, userId) {
	await db.delete(sessions).where(eq(sessions.user_id, userId));
	await db.update(family).set({ user_id: null }).where(eq(family.user_id, userId));
	await db.delete(users).where(eq(users.id, userId));
}

export async function updatePassword(db, userId, newPasswordHash) {
	await db.update(users).set({ password_hash: newPasswordHash }).where(eq(users.id, userId));
}

// ── Login Attempts ───────────────────────────────────────────────────────────

export async function incrementFailedLogins(db, userId) {
	const [user] = await db.select({ failed_login_attempts: users.failed_login_attempts }).from(users).where(eq(users.id, userId));

	const attempts = (user?.failed_login_attempts ?? 0) + 1;
	const updates = { failed_login_attempts: attempts };

	if (attempts >= 5) {
		const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
		updates.locked_until = toUtcString(lockUntil);
	}

	await db.update(users).set(updates).where(eq(users.id, userId));
}

export async function resetFailedLogins(db, userId) {
	await db.update(users).set({ failed_login_attempts: 0, locked_until: null }).where(eq(users.id, userId));
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(db, userId) {
	const id = crypto.randomBytes(32).toString('hex');
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	await db.insert(sessions).values({
		id,
		user_id: userId,
		expires_at: toUtcString(expiresAt),
		created_at: toUtcString(now)
	});

	return id;
}

export async function getSession(db, sessionId) {
	const now = toUtcString(new Date());
	const [row] = await db
		.select({
			session: {
				id: sessions.id,
				user_id: sessions.user_id,
				expires_at: sessions.expires_at,
				created_at: sessions.created_at
			},
			user: {
				id: users.id,
				username: users.username,
				is_admin: users.is_admin,
				failed_login_attempts: users.failed_login_attempts,
				locked_until: users.locked_until,
				created_at: users.created_at
			}
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.user_id))
		.where(and(eq(sessions.id, sessionId), gt(sessions.expires_at, now)));

	return row ?? null;
}

export async function deleteSession(db, sessionId) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteExpiredSessions(db) {
	const now = toUtcString(new Date());
	await db.delete(sessions).where(gt(now, sessions.expires_at));
}

export async function deleteUserSessions(db, userId) {
	await db.delete(sessions).where(eq(sessions.user_id, userId));
}

// ── Invite Codes ─────────────────────────────────────────────────────────────

export async function createInviteCode(db, createdBy) {
	const code = crypto.randomBytes(4).toString('hex');
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

	const [row] = await db
		.insert(invite_codes)
		.values({
			code,
			created_by: createdBy,
			expires_at: toUtcString(expiresAt),
			created_at: toUtcString(now)
		})
		.returning();

	return row;
}

export async function getInviteCode(db, code) {
	const now = toUtcString(new Date());
	const [row] = await db
		.select()
		.from(invite_codes)
		.where(and(eq(invite_codes.code, code), isNull(invite_codes.used_by), gt(invite_codes.expires_at, now)));
	return row;
}

export async function markInviteUsed(db, codeId, usedByUserId) {
	await db.update(invite_codes).set({ used_by: usedByUserId }).where(eq(invite_codes.id, codeId));
}

export async function getActiveInvites(db) {
	const now = toUtcString(new Date());
	return db
		.select()
		.from(invite_codes)
		.where(and(isNull(invite_codes.used_by), gt(invite_codes.expires_at, now)));
}

// ── Family ↔ User Linking ────────────────────────────────────────────────────

export async function getUserFamilyMember(db, userId) {
	const [row] = await db.select().from(family).where(eq(family.user_id, userId));
	return row;
}

export async function linkFamilyMemberToUser(db, familyMemberId, userId) {
	await db.update(family).set({ user_id: userId }).where(eq(family.id, familyMemberId));
}
