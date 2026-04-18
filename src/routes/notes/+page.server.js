import { getNotes, getNoteWithBodies, createNote, updateNote, deleteNote, togglePin } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export async function load({ cookies }) {
	const memberId = Number(cookies.get('member_id') || 0) || null;
	return { notes: await getNotes(memberId) };
}

export const actions = {
	save: async ({ request, cookies }) => {
		const memberId = Number(cookies.get('member_id') || 0) || null;
		const data = await request.formData();
		const id = data.get('id');
		const title = (data.get('title') ?? '').toString().trim() || null;
		const summary = (data.get('summary') ?? '').toString().trim() || null;
		const color = (data.get('color') ?? '').toString() || null;

		const subtitles = data.getAll('subtitle');
		const bodyTexts = data.getAll('body');
		const bodies = subtitles.map((sub, i) => ({
			subtitle: sub.toString().trim() || null,
			body: bodyTexts[i]?.toString().trim() || null
		}));

		if (id) {
			await updateNote(Number(id), { title, summary, color, bodies });
		} else {
			await createNote({ title, summary, color, created_by: memberId, bodies });
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		await deleteNote(Number(id));
		return { success: true };
	},

	pin: async ({ request, cookies }) => {
		const memberId = Number(cookies.get('member_id') || 0) || null;
		if (!memberId) {
			return fail(400, { error: 'No member selected' });
		}
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		await togglePin(memberId, Number(id), 'note');
		return { success: true };
	},

	loadNote: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) {
			return fail(400, { error: 'Missing id' });
		}
		const note = await getNoteWithBodies(Number(id));
		return { note };
	}
};
