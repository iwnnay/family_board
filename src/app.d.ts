declare global {
	namespace App {
		interface Locals {
			user: { id: number; username: string; is_admin: number } | null;
			session: { id: string; expires_at: string } | null;
			currentMember: { id: number; name: string; color: string | null } | null;
		}
	}
}

export {};
