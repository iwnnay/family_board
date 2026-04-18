import { getChores, addChore, updateChore, deleteChore, getChoreById } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const IMAGE_DIR = join('static', 'store', 'images', 'chores');
if (!existsSync(IMAGE_DIR)) mkdirSync(IMAGE_DIR, { recursive: true });

async function saveUpload(file) {
	const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
	await sharp(Buffer.from(await file.arrayBuffer()))
		.resize(150, 150, { fit: 'cover', position: 'centre' })
		.webp({ quality: 85 })
		.toFile(join(IMAGE_DIR, filename));
	return filename;
}

async function removeFile(filename) {
	if (!filename) return;
	try {
		await unlink(join(IMAGE_DIR, filename));
	} catch {
		// file already gone — ignore
	}
}

export function load() {
	return { chores: getChores() };
}

export const actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		const name = (data.get('name') ?? '').toString().trim();
		const frequency = data.get('frequency') ?? 'none';
		const suggested_day = (data.get('suggested_day') ?? '').toString().trim();
		const removeImage = data.get('remove_image') === '1';
		const file = data.get('image');
		const hasNewFile = file instanceof File && file.size > 0;

		if (!name) return fail(400, { error: 'Name is required' });

		if (id) {
			const existing = getChoreById(Number(id));
			let image = undefined; // undefined = don't touch the image column

			if (removeImage) {
				await removeFile(existing?.image);
				image = null;
			} else if (hasNewFile) {
				await removeFile(existing?.image);
				image = await saveUpload(file);
			}

			updateChore(Number(id), name, frequency, suggested_day, image);
		} else {
			const image = hasNewFile ? await saveUpload(file) : null;
			addChore(name, frequency, suggested_day, image);
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (id) {
			const chore = getChoreById(Number(id));
			await removeFile(chore?.image);
			deleteChore(Number(id));
		}
		return { success: true };
	}
};
