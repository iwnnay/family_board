import sharp from 'sharp';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const IMAGE_DIR = join('static', 'store', 'images', 'chores');

function ensureDir() {
	if (!existsSync(IMAGE_DIR)) {
		mkdirSync(IMAGE_DIR, { recursive: true });
	}
}

/**
 * Resizes and center-crops the uploaded file to 150×150 WebP,
 * writes it to IMAGE_DIR, and returns the generated filename.
 */
export async function saveChoreImage(file) {
	ensureDir();
	const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
	await sharp(Buffer.from(await file.arrayBuffer()))
		.resize(150, 150, { fit: 'cover', position: 'centre' })
		.webp({ quality: 85 })
		.toFile(join(IMAGE_DIR, filename));
	return filename;
}

/** Deletes a stored chore image by filename. Silently ignores missing files. */
export async function deleteChoreImage(filename) {
	if (!filename) {
		return;
	}
	try {
		await unlink(join(IMAGE_DIR, filename));
	} catch {
		// file already gone — nothing to do
	}
}
