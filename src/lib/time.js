/**
 * Timestamps are stored in the database as 'YYYY-MM-DD HH:MM:SS' strings
 * representing UTC. Display code converts back to the user's local timezone
 * via standard Date / toLocale* methods.
 */

/** Convert a Date to the UTC storage string format. */
export function toUtcString(date = new Date()) {
	return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Parse a stored timestamp (assumed UTC) into a Date object.
 * - Storage format ('YYYY-MM-DD HH:MM:SS') → interpreted as UTC
 * - ISO-8601 strings (with 'T') → left for the JS engine to handle (so 'Z'
 *   means UTC and bare ISO means local, matching standard semantics)
 */
export function parseUtc(input) {
	if (input == null) return null;
	if (input instanceof Date) return input;
	if (input.includes('T')) return new Date(input);
	return new Date(input.replace(' ', 'T') + 'Z');
}
