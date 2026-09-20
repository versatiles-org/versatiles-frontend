import { clearCache } from './utils/cache';

/**
 * Empties the download/compression cache.
 *
 * The cache is content-addressed and grows without bound: every upstream release orphans the
 * entries that belonged to the previous version, and nothing removes them. Run this when it
 * has outgrown its usefulness - the next build refetches and recompresses what it needs.
 */

/** Groups digits for readability, e.g. 49075 -> 49'075. Matches the release overview table. */
function group(value: number): string {
	return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

const { entries, bytes } = clearCache();

if (entries === 0) {
	console.log('Cache is already empty.');
} else {
	const label = entries === 1 ? 'entry' : 'entries';
	console.log(`Removed ${group(entries)} ${label} (${group(Math.round(bytes / 1e6))} MB).`);
}
