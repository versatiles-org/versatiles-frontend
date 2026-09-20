import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { cleanupFolder, ensureFolder } from './utils';

/**
 * The cache folder: `cache/` next to the project, unless `VERSATILES_CACHE_DIR` names another.
 *
 * Relocating it lets the tests drive the real filesystem instead of a mocked one - without the
 * override they would write into the project's own cache - and lets a CI job point the cache at
 * a volume it restores between runs. Read once, at import time.
 */
const cacheFolder = process.env.VERSATILES_CACHE_DIR
	? resolve(process.env.VERSATILES_CACHE_DIR)
	: resolve(import.meta.dirname, '../../cache');

// Ensure the cache folder exists.
mkdirSync(cacheFolder, { recursive: true });

/**
 * What a cache folder holds, or what emptying it removed.
 */
export interface CacheStats {
	entries: number;
	bytes: number;
}

/**
 * Measures the cache folder without changing it.
 */
export function measureCache(): CacheStats {
	if (!existsSync(cacheFolder)) return { entries: 0, bytes: 0 };

	let entries = 0;
	let bytes = 0;
	for (const entry of readdirSync(cacheFolder, { withFileTypes: true, recursive: true })) {
		if (!entry.isFile()) continue;
		entries++;
		bytes += statSync(resolve(entry.parentPath, entry.name)).size;
	}
	return { entries, bytes };
}

/**
 * Empties the cache and reports what was removed.
 *
 * Entries are never evicted while building: an upstream release simply orphans the ones that
 * belonged to the previous version, and they stay. Nothing here is precious - every entry is
 * either a download that can be fetched again or a compression result that can be recomputed -
 * so emptying the cache only ever costs time, never data.
 */
export function clearCache(): CacheStats {
	const removed = measureCache();
	cleanupFolder(cacheFolder);
	return removed;
}

/**
 * Attempts to retrieve a cached value for a given key. If the value is not found in the cache,
 * it will call the provided callback to generate the value, cache it, then return the value.
 *
 * @param key - The cache key to retrieve or store the value under.
 * @param cbBuffer - A callback function that returns a Promise resolving to the Buffer to be cached
 *                   if the key is not already present in the cache.
 * @param maxAgeMs - How long an entry stays valid. Omit for entries that never go stale, such as
 *                   content addressed by its own hash. Pass a duration for answers that can
 *                   change over time, e.g. "the latest release of a repository".
 * @returns A Promise resolving to the Buffer associated with the key, either retrieved from cache or newly cached.
 */
export async function cache(
	action: string,
	key: string,
	cbBuffer: () => Promise<Buffer>,
	maxAgeMs?: number
): Promise<Buffer> {
	const folder = resolve(cacheFolder, sanitize(action));
	const filename = resolve(folder, filenameForKey(key));

	if (existsSync(filename) && !isExpired(filename, maxAgeMs)) return readFileSync(filename);

	const buffer = await cbBuffer();
	if (!(buffer instanceof Buffer)) throw Error('The callback function must return a Buffer');

	ensureFolder(folder);
	// Write atomically: a crash or concurrent write mid-`writeFileSync` must not leave a
	// truncated file that a later run would treat as a valid cache hit. Write to a unique
	// temp file first, then rename (atomic on the same filesystem).
	const tmpFilename = `${filename}.${process.pid}.tmp`;
	writeFileSync(tmpFilename, buffer);
	renameSync(tmpFilename, filename);

	return buffer;

	function isExpired(path: string, maxAge?: number): boolean {
		if (maxAge == null) return false;
		return Date.now() - statSync(path).mtimeMs > maxAge;
	}

	function filenameForKey(rawKey: string): string {
		// `sanitize` is lossy and not injective: it rewrites "a/b" to "a_x47_b", which is also
		// what a key literally named "a_x47_b" produces. Truncation collides too. So the name
		// is only there to make the cache folder readable - the hash is what identifies the
		// entry. Truncating keeps the result well under the typical 255-byte filename limit.
		const hash = createHash('sha256').update(rawKey).digest('hex').slice(0, 16);
		return `${sanitize(rawKey).slice(0, 200)}_${hash}`;
	}

	function sanitize(rawKey: string): string {
		return rawKey
			.replace(/[^a-z0-9-_. ]/gi, (c) => ' x' + c.charCodeAt(0) + ' ')
			.trim()
			.replace(/\s+/g, '_');
	}
}
