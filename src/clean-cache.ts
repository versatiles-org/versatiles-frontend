import { clearCache, groupDigits } from './utils';

/**
 * Empties the download/compression cache.
 *
 * The cache is content-addressed and grows without bound: every upstream release orphans the
 * entries that belonged to the previous version, and nothing removes them. Run this when it
 * has outgrown its usefulness - the next build refetches and recompresses what it needs.
 */

const { entries, bytes } = clearCache();

if (entries === 0) {
	console.log('Cache is already empty.');
} else {
	const label = entries === 1 ? 'entry' : 'entries';
	console.log(`Removed ${groupDigits(entries)} ${label} (${groupDigits(Math.round(bytes / 1e6))} MB).`);
}
