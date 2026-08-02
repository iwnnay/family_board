import sharp from 'sharp';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const IMAGE_ROOT = join('static', 'store', 'images');

export const IMAGE_DIR = join(IMAGE_ROOT, 'chores');
export const LIST_IMAGE_DIR = join(IMAGE_ROOT, 'lists');

/** Largest upload accepted before conversion (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function ensureDir(dir) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

function randomName() {
	return `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
}

/** True for a non-empty File upload that is small enough to process. */
export function isUsableUpload(file) {
	return file instanceof File && file.size > 0 && file.size <= MAX_UPLOAD_BYTES;
}

/**
 * Writes `file` into `dir` as WebP after applying `transform` to the sharp
 * pipeline, and returns the generated filename.
 */
async function saveImage(dir, file, transform) {
	ensureDir(dir);
	const filename = randomName();
	await transform(sharp(Buffer.from(await file.arrayBuffer())))
		.webp({ quality: 85 })
		.toFile(join(dir, filename));
	return filename;
}

/**
 * Deletes a stored image. Only the basename is used, so a value that somehow
 * came from user input can never escape `dir`. Missing files are ignored.
 */
async function deleteImage(dir, filename) {
	if (!filename) {
		return;
	}
	try {
		await unlink(join(dir, basename(filename)));
	} catch {
		// file already gone — nothing to do
	}
}

/**
 * Resizes and center-crops the uploaded file to 150×150 WebP,
 * writes it to IMAGE_DIR, and returns the generated filename.
 */
export async function saveChoreImage(file) {
	return saveImage(IMAGE_DIR, file, (img) => img.resize(150, 150, { fit: 'cover', position: 'centre' }));
}

/** Deletes a stored chore image by filename. Silently ignores missing files. */
export async function deleteChoreImage(filename) {
	return deleteImage(IMAGE_DIR, filename);
}

/**
 * List item photos keep their aspect ratio (they're looked at, not tiled) and
 * are capped at 800px on the long edge.
 */
export async function saveListItemImage(file) {
	return saveImage(LIST_IMAGE_DIR, file, (img) => img.rotate().resize(800, 800, { fit: 'inside', withoutEnlargement: true }));
}

/** Deletes a stored list item image by filename. Silently ignores missing files. */
export async function deleteListItemImage(filename) {
	return deleteImage(LIST_IMAGE_DIR, filename);
}

/** Bulk delete, used when a whole list (and all its items) goes away. */
export async function deleteListItemImages(filenames = []) {
	await Promise.all(filenames.filter(Boolean).map((f) => deleteListItemImage(f)));
}
