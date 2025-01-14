import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureFolder } from './utils';

// Define the path to the cache folder relative to the module location.
const cacheFolder = new URL('../../cache', import.meta.url).pathname;

// Initialize the "database" for caching with string keys and Buffer values.
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
	const folder = resolve(cacheFolder, action);
	const filename = resolve(folder, key.replace(/[^a-z0-9-_.]/gi, c => '_x' + c.charCodeAt(0) + '_')).replace(/_+/g, '_');

	if (existsSync(filename)) return readFileSync(filename);

	const buffer = await cbBuffer();
	if (!(buffer instanceof Buffer)) throw Error('The callback function must return a Buffer');

	ensureFolder(folder);
	writeFileSync(filename, buffer);

	return buffer;
}
