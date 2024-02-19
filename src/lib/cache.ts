import { ClassicLevel } from 'classic-level';

// Define the path to the cache folder relative to the module location.
const folder = new URL('../../cache', import.meta.url).pathname;
// Initialize the LevelDB database for caching with string keys and Buffer values.
const db = new ClassicLevel<string, Buffer>(folder, { keyEncoding: 'utf8', valueEncoding: 'buffer' });

/**
 * Attempts to retrieve a cached value for a given key. If the value is not found in the cache,
 * it will call the provided callback to generate the value, cache it, then return the value.
 *
 * @param key - The cache key to retrieve or store the value under.
 * @param cbBuffer - A callback function that returns a Promise resolving to the Buffer to be cached
 *                   if the key is not already present in the cache.
 * @returns A Promise resolving to the Buffer associated with the key, either retrieved from cache or newly cached.
 */
async function cache(key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> {
	let buffer: Buffer | false = false;
	try {
		// Attempt to retrieve the cached value.
		buffer = await db.get(key);
	} catch (err) {
		// An error is thrown if the key doesn't exist, indicating the value is not in cache.
	}

	if (buffer === false) {
		// If the value is not in cache, call cbBuffer to get the value and cache it.
		buffer = await cbBuffer();
		if (!(buffer instanceof Buffer)) throw Error('The callback function must return a Buffer');
		await db.put(key, buffer); // Cache the newly obtained value.
	} else {
		// Ensure the retrieved value is a Buffer.
		if (!(buffer instanceof Buffer)) throw Error('Cached value is not a Buffer');
	}

	return buffer;
}

export default cache;
