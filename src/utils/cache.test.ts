import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fs and path modules
vi.mock('fs', () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	renameSync: vi.fn(),
	statSync: vi.fn(),
}));
vi.mock('path', () => ({
	resolve: vi.fn((...args: string[]) => args.join('/')),
}));
vi.mock('./utils.js', () => ({
	ensureFolder: vi.fn(),
	cleanupFolder: vi.fn(),
}));

const { cache, clearCache, measureCache } = await import('./cache.js');
const fs = await import('fs');
const utils = await import('./utils.js');

/** A `readdirSync(..., { withFileTypes: true, recursive: true })` entry. */
function dirent(parentPath: string, name: string, isFile = true) {
	return { parentPath, name, isFile: () => isFile } as unknown as ReturnType<typeof fs.readdirSync>[number];
}

describe('cache function', () => {
	beforeEach(() => {
		// Clear mocks before each test
		vi.clearAllMocks();
	});

	it('should retrieve a value from cache if it exists', async () => {
		const mockBuffer = Buffer.from('cached data');
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);

		const result = await cache('action', 'key', async () => {
			throw new Error('Callback should not be called when the key exists');
		});

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key_[0-9a-f]{16}$/));
		expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key_[0-9a-f]{16}$/));
		expect(result).toBe(mockBuffer);
	});

	it('should call the callback, cache the result, and return it if the key does not exist', async () => {
		const mockBuffer = Buffer.from('generated data');
		vi.mocked(fs.existsSync).mockReturnValue(false);

		const result = await cache('action', 'key', async () => mockBuffer);

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key_[0-9a-f]{16}$/));
		expect(fs.readFileSync).not.toHaveBeenCalled();
		// Written atomically: to a temp file, then renamed to the final path.
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/action\/key_[0-9a-f]{16}\.\d+\.tmp$/),
			mockBuffer
		);
		expect(fs.renameSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/action\/key_[0-9a-f]{16}\.\d+\.tmp$/),
			expect.stringMatching(/\/action\/key_[0-9a-f]{16}$/)
		);
		expect(result).toBe(mockBuffer);
	});

	it('should throw an error if the callback does not return a Buffer', async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);

		await expect(cache('action', 'key', async () => 'not a buffer' as unknown as Buffer)).rejects.toThrow(
			'The callback function must return a Buffer'
		);

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key_[0-9a-f]{16}$/));
		expect(fs.readFileSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it('should correctly sanitize the filename derived from the key', async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const mockBuffer = Buffer.from('data');
		await cache('äçtion', 'key/with special@chars', async () => mockBuffer);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/x228_x231_tion\/key_x47_with_special_x64_chars_[0-9a-f]{16}\.\d+\.tmp$/),
			mockBuffer
		);
		expect(fs.renameSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/x228_x231_tion\/key_x47_with_special_x64_chars_[0-9a-f]{16}\.\d+\.tmp$/),
			expect.stringMatching(/\/x228_x231_tion\/key_x47_with_special_x64_chars_[0-9a-f]{16}$/)
		);
	});

	it('reuses an entry that is younger than maxAgeMs', async () => {
		const mockBuffer = Buffer.from('fresh');
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: Date.now() - 1000 } as ReturnType<typeof fs.statSync>);
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);

		const result = await cache(
			'action',
			'key',
			async () => {
				throw new Error('Callback should not be called while the entry is fresh');
			},
			60_000
		);

		expect(result).toBe(mockBuffer);
	});

	it('refetches an entry that is older than maxAgeMs', async () => {
		const mockBuffer = Buffer.from('regenerated');
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: Date.now() - 120_000 } as ReturnType<typeof fs.statSync>);

		const result = await cache('action', 'key', async () => mockBuffer, 60_000);

		expect(fs.readFileSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/action\/key_[0-9a-f]{16}\.\d+\.tmp$/),
			mockBuffer
		);
		expect(result).toBe(mockBuffer);
	});

	it('never expires an entry when no maxAgeMs is given', async () => {
		const mockBuffer = Buffer.from('immortal');
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);

		const result = await cache('action', 'key', async () => {
			throw new Error('Callback should not be called for an entry without an age limit');
		});

		expect(fs.statSync).not.toHaveBeenCalled();
		expect(result).toBe(mockBuffer);
	});

	it('bounds very long keys with a hash suffix to avoid ENAMETOOLONG', async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const mockBuffer = Buffer.from('data');

		await cache('action', 'a'.repeat(300), async () => mockBuffer);

		const writtenPath = vi.mocked(fs.writeFileSync).mock.calls[0][0] as string;
		const keySegment = writtenPath
			.split('/')
			.pop()!
			.replace(/\.\d+\.tmp$/, '');
		// 200 truncated chars + '_' + 16 hex chars of the sha256 hash.
		expect(keySegment).toMatch(/^a{200}_[0-9a-f]{16}$/);
	});

	/**
	 * Reads back the final (post-rename) cache path a call wrote to.
	 */
	async function pathWrittenFor(key: string): Promise<string> {
		vi.clearAllMocks();
		vi.mocked(fs.existsSync).mockReturnValue(false);
		await cache('action', key, async () => Buffer.from('data'));
		return vi.mocked(fs.renameSync).mock.calls[0][1] as string;
	}

	it('gives distinct keys distinct files even when they sanitize alike', async () => {
		// `sanitize` rewrites '/' to '_x47_', so these two keys share a sanitized name. Only
		// the hash suffix keeps them apart - without it, one would serve the other's content.
		expect(await pathWrittenFor('a/b')).not.toBe(await pathWrittenFor('a_x47_b'));
	});

	it('gives distinct keys distinct files even when they truncate alike', async () => {
		// Both exceed the 200-char bound and share their first 200 characters.
		expect(await pathWrittenFor('b'.repeat(250) + 'one')).not.toBe(await pathWrittenFor('b'.repeat(250) + 'two'));
	});

	it('gives the same key the same file every time', async () => {
		// The counterpart to the two tests above: the hash must be stable, or nothing ever hits.
		expect(await pathWrittenFor('a/b')).toBe(await pathWrittenFor('a/b'));
	});
});

describe('clearCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reports the entries and bytes it removed, and empties the folder', () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readdirSync).mockReturnValue([
			dirent('/cache/compress', 'aaa'),
			dirent('/cache/compress', 'bbb'),
			dirent('/cache/getBuffer', 'ccc'),
		]);
		vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as ReturnType<typeof fs.statSync>);

		expect(clearCache()).toStrictEqual({ entries: 3, bytes: 300 });
		expect(utils.cleanupFolder).toHaveBeenCalledWith(expect.stringMatching(/\/cache$/));
	});

	it('counts only files, not the action sub-folders', () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readdirSync).mockReturnValue([dirent('/cache', 'compress', false), dirent('/cache/compress', 'aaa')]);
		vi.mocked(fs.statSync).mockReturnValue({ size: 7 } as ReturnType<typeof fs.statSync>);

		expect(measureCache()).toStrictEqual({ entries: 1, bytes: 7 });
		// A directory has no meaningful size here, and statting it would inflate the total.
		expect(fs.statSync).toHaveBeenCalledTimes(1);
	});

	it('reports nothing when the cache folder does not exist', () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);

		expect(clearCache()).toStrictEqual({ entries: 0, bytes: 0 });
		expect(fs.readdirSync).not.toHaveBeenCalled();
	});

	it('measures without deleting', () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readdirSync).mockReturnValue([dirent('/cache/compress', 'aaa')]);
		vi.mocked(fs.statSync).mockReturnValue({ size: 42 } as ReturnType<typeof fs.statSync>);

		expect(measureCache()).toStrictEqual({ entries: 1, bytes: 42 });
		expect(utils.cleanupFolder).not.toHaveBeenCalled();
	});
});
