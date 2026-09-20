import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * These tests run against a real directory rather than a mocked `fs`.
 *
 * What is worth asserting about a cache - that a hit returns exactly the bytes that were stored,
 * that a crashed write cannot be mistaken for a valid entry, that an entry expires on age, that
 * two keys never collide - is behaviour of the filesystem plus this module together. Against
 * `vi.fn()` stubs none of it is observable: the assertions can only say "writeFileSync was
 * called, then renameSync was called", which is a restatement of the implementation and would
 * keep passing if the bytes were wrong, the rename were to the wrong path, or the read came back
 * truncated.
 *
 * The folder is redirected before the import because the module resolves it once, at load time.
 */
const cacheDir = mkdtempSync(join(tmpdir(), 'versatiles-cache-test-'));
process.env.VERSATILES_CACHE_DIR = cacheDir;

const { cache, clearCache, measureCache } = await import('./cache.js');

afterAll(() => {
	rmSync(cacheDir, { recursive: true, force: true });
});

/** Every file currently in the cache, as `action/filename`. */
function storedFiles(): string[] {
	return readdirSync(cacheDir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath.slice(cacheDir.length + 1), entry.name))
		.sort();
}

/** Backdates an entry so age-based expiry can be exercised without waiting or faking timers. */
function ageBy(relPath: string, ms: number): void {
	const path = resolve(cacheDir, relPath);
	const when = new Date(Date.now() - ms);
	utimesSync(path, when, when);
}

describe('cache', () => {
	beforeEach(() => {
		for (const entry of readdirSync(cacheDir)) rmSync(resolve(cacheDir, entry), { recursive: true, force: true });
	});

	it('calls the callback on a miss and stores the result', async () => {
		const callback = vi.fn(async () => Buffer.from('generated'));

		const result = await cache('action', 'key', callback);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(result).toStrictEqual(Buffer.from('generated'));
		// Exactly one file, and it holds precisely the bytes the callback produced.
		const files = storedFiles();
		expect(files).toHaveLength(1);
		expect(readFileSync(resolve(cacheDir, files[0]))).toStrictEqual(Buffer.from('generated'));
	});

	it('returns the stored bytes on a hit without calling the callback', async () => {
		await cache('action', 'key', async () => Buffer.from('first'));
		const callback = vi.fn(async () => Buffer.from('second'));

		const result = await cache('action', 'key', callback);

		expect(callback).not.toHaveBeenCalled();
		// The point of the hit: the original bytes come back, not the ones the callback would
		// have produced. A mock that only counts calls cannot tell these apart.
		expect(result).toStrictEqual(Buffer.from('first'));
	});

	it('round-trips binary content byte for byte', async () => {
		const binary = Buffer.from([0x00, 0xff, 0x0a, 0x0d, 0x1a, 0x80, 0x7f]);
		await cache('action', 'binary', async () => binary);

		expect(await cache('action', 'binary', async () => Buffer.alloc(0))).toStrictEqual(binary);
	});

	it('leaves no temporary file behind after a successful write', async () => {
		await cache('action', 'key', async () => Buffer.from('data'));

		expect(storedFiles().filter((name) => name.includes('.tmp'))).toStrictEqual([]);
	});

	it('writes nothing when the callback throws', async () => {
		await expect(cache('action', 'key', () => Promise.reject(Error('upstream failed')))).rejects.toThrow(
			'upstream failed'
		);

		// Neither a finished entry nor a temp file: a later run must see a clean miss.
		expect(storedFiles()).toStrictEqual([]);
	});

	it('writes nothing when the callback does not return a Buffer', async () => {
		await expect(cache('action', 'key', async () => 'not a buffer' as unknown as Buffer)).rejects.toThrow(
			'The callback function must return a Buffer'
		);

		expect(storedFiles()).toStrictEqual([]);
	});

	it('never serves a half-written entry as a hit', async () => {
		// Simulate a process killed mid-write under the old, non-atomic scheme: a .tmp file with
		// partial content. It must not be mistaken for the entry itself.
		await cache('action', 'key', async () => Buffer.from('complete'));
		const [name] = storedFiles();
		writeFileSync(resolve(cacheDir, `${name}.99999.tmp`), Buffer.from('trunc'));

		expect(await cache('action', 'key', async () => Buffer.from('regenerated'))).toStrictEqual(Buffer.from('complete'));
	});

	describe('expiry', () => {
		it('reuses an entry younger than maxAgeMs', async () => {
			await cache('action', 'key', async () => Buffer.from('fresh'));
			const callback = vi.fn(async () => Buffer.from('refetched'));

			const result = await cache('action', 'key', callback, 60_000);

			expect(callback).not.toHaveBeenCalled();
			expect(result).toStrictEqual(Buffer.from('fresh'));
		});

		it('refetches an entry older than maxAgeMs and replaces it', async () => {
			await cache('action', 'key', async () => Buffer.from('stale'));
			ageBy(storedFiles()[0], 120_000);

			const result = await cache('action', 'key', async () => Buffer.from('refetched'), 60_000);

			expect(result).toStrictEqual(Buffer.from('refetched'));
			// The replacement is persisted, so the next call hits the new value rather than the old.
			expect(await cache('action', 'key', async () => Buffer.from('third'), 60_000)).toStrictEqual(
				Buffer.from('refetched')
			);
		});

		it('never expires an entry when no maxAgeMs is given', async () => {
			await cache('action', 'key', async () => Buffer.from('immortal'));
			ageBy(storedFiles()[0], 365 * 24 * 3600_000);

			expect(await cache('action', 'key', async () => Buffer.from('refetched'))).toStrictEqual(Buffer.from('immortal'));
		});
	});

	describe('key handling', () => {
		it('gives distinct keys distinct content, even when they sanitize alike', async () => {
			// `sanitize` rewrites '/' to '_x47_', so these two keys share a sanitized name. This is
			// the collision in its consequential form: one key serving the other's bytes.
			await cache('action', 'a/b', async () => Buffer.from('slash'));
			await cache('action', 'a_x47_b', async () => Buffer.from('literal'));

			expect(await cache('action', 'a/b', async () => Buffer.alloc(0))).toStrictEqual(Buffer.from('slash'));
			expect(await cache('action', 'a_x47_b', async () => Buffer.alloc(0))).toStrictEqual(Buffer.from('literal'));
			expect(storedFiles()).toHaveLength(2);
		});

		it('gives distinct keys distinct content, even when they truncate alike', async () => {
			const long = 'b'.repeat(250);
			await cache('action', `${long}one`, async () => Buffer.from('one'));
			await cache('action', `${long}two`, async () => Buffer.from('two'));

			expect(await cache('action', `${long}one`, async () => Buffer.alloc(0))).toStrictEqual(Buffer.from('one'));
			expect(await cache('action', `${long}two`, async () => Buffer.alloc(0))).toStrictEqual(Buffer.from('two'));
		});

		it('bounds the filename of a very long key', async () => {
			await cache('action', 'a'.repeat(300), async () => Buffer.from('data'));

			const [name] = storedFiles();
			// 200 truncated characters + '_' + 16 hex characters of the sha256 hash, well under the
			// 255-byte limit a filesystem typically imposes.
			expect(name).toMatch(/^action\/a{200}_[0-9a-f]{16}$/);
		});

		it('keeps the readable part of a key in the filename', async () => {
			await cache('äçtion', 'key/with special@chars', async () => Buffer.from('data'));

			expect(storedFiles()[0]).toMatch(/^x228_x231_tion\/key_x47_with_special_x64_chars_[0-9a-f]{16}$/);
		});

		it('separates entries of different actions', async () => {
			await cache('compress', 'key', async () => Buffer.from('compressed'));
			await cache('getBuffer', 'key', async () => Buffer.from('downloaded'));

			expect(await cache('compress', 'key', async () => Buffer.alloc(0))).toStrictEqual(Buffer.from('compressed'));
			expect(storedFiles().map((name) => name.split('/')[0])).toStrictEqual(['compress', 'getBuffer']);
		});
	});

	describe('clearCache', () => {
		it('reports what it removed and empties the folder', async () => {
			await cache('compress', 'a', async () => Buffer.alloc(100));
			await cache('compress', 'b', async () => Buffer.alloc(200));
			await cache('getBuffer', 'c', async () => Buffer.alloc(300));

			expect(clearCache()).toStrictEqual({ entries: 3, bytes: 600 });
			expect(storedFiles()).toStrictEqual([]);
			// The folder itself survives: the module expects it to exist.
			expect(existsSync(cacheDir)).toBe(true);
		});

		it('reports nothing for an empty cache', () => {
			expect(clearCache()).toStrictEqual({ entries: 0, bytes: 0 });
		});

		it('measures without deleting', async () => {
			await cache('compress', 'a', async () => Buffer.alloc(42));

			expect(measureCache()).toStrictEqual({ entries: 1, bytes: 42 });
			expect(measureCache()).toStrictEqual({ entries: 1, bytes: 42 });
			expect(storedFiles()).toHaveLength(1);
		});

		it('counts files in nested action folders, not the folders themselves', async () => {
			await cache('compress', 'a', async () => Buffer.alloc(10));

			const { entries, bytes } = measureCache();
			expect(entries).toBe(1);
			expect(bytes).toBe(10);
			// Sanity: the file really is nested one level down, so a directory was walked into.
			expect(statSync(resolve(cacheDir, 'compress')).isDirectory()).toBe(true);
		});
	});
});
