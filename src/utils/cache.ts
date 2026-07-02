import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { ensureFolder } from './utils';

// Define the path to the cache folder relative to the module location.
const cacheFolder = new URL('../../cache', import.meta.url).pathname;

// Ensure the cache folder exists.
mkdirSync(cacheFolder, { recursive: true });

/**
 * Attempts to retrieve a cached value for a given key. If the value is not found in the cache,
 * it will call the provided callback to generate the value, cache it, then return the value.
 *
 * @param key - The cache key to retrieve or store the value under.
 * @param cbBuffer - A callback function that returns a Promise resolving to the Buffer to be cached
 *                   if the key is not already present in the cache.
 * @returns A Promise resolving to the Buffer associated with the key, either retrieved from cache or newly cached.
 */
export async function cache(action: string, key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> {
	const folder = resolve(cacheFolder, sanitize(action));
	const filename = resolve(folder, filenameForKey(key));

	if (existsSync(filename)) return readFileSync(filename);

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

	function filenameForKey(rawKey: string): string {
		const name = sanitize(rawKey);
		// Bound the filename to stay well under the typical 255-byte limit; disambiguate the
		// truncated name with a short hash of the full key so long URLs don't collide/throw.
		if (name.length <= 200) return name;
		const hash = createHash('sha256').update(rawKey).digest('hex').slice(0, 16);
		return `${name.slice(0, 200)}_${hash}`;
	}

	function sanitize(rawKey: string): string {
		return rawKey
			.replace(/[^a-z0-9-_. ]/gi, (c) => ' x' + c.charCodeAt(0) + ' ')
			.trim()
			.replace(/\s+/g, '_');
	}
}
