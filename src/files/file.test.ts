import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import type { InputType, BrotliOptions, CompressCallback } from 'zlib';

vi.mock('zlib', () => ({
	brotliCompress: vi.fn((_buf: InputType, _options: BrotliOptions, callback: CompressCallback): void => {
		callback(null, Buffer.from('compressed-data'));
	}),
	constants: {
		BROTLI_PARAM_QUALITY: 11,
		BROTLI_PARAM_SIZE_HINT: 12,
	},
}));

// Mock cache module
vi.mock('../utils/cache', () => ({
	cache: vi.fn(async (_action: string, _key: string, cbBuffer: () => Promise<Buffer>) => cbBuffer()),
}));

const { brotliCompress, constants } = await import('zlib');
const { cache } = await import('../utils/cache');
const { File } = await import('./file');

describe('File', () => {
	const mockName = 'test.txt';
	const mockBufferRaw = Buffer.from('raw-data');
	const expectedHash = createHash('sha256').update(mockBufferRaw).digest('hex');

	// Call records are asserted below, and without this they would leak between tests.
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with the correct properties', () => {
		const file = new File(mockName, mockBufferRaw);

		expect(file.name).toBe(mockName);
		expect(file.contentHash).toBe(expectedHash);
		expect(file.bufferRaw).toBe(mockBufferRaw);
		expect(file.bufferBr).toBeUndefined();
	});

	it('should produce a stable hash for identical content regardless of identity', () => {
		const a = new File(mockName, Buffer.from('raw-data'));
		const b = new File(mockName, Buffer.from('raw-data'));

		expect(a.contentHash).toBe(b.contentHash);
	});

	it('should produce different hashes for different content', () => {
		const a = new File(mockName, Buffer.from('one'));
		const b = new File(mockName, Buffer.from('two'));

		expect(a.contentHash).not.toBe(b.contentHash);
	});

	it('should hash content only, so the same bytes hash alike under different names', () => {
		const a = new File('fira_sans_black/10240-10495.pbf', Buffer.from('raw-data'));
		const b = new File('noto_sans_italic/58880-59135.pbf', Buffer.from('raw-data'));

		expect(a.contentHash).toBe(b.contentHash);
	});

	it('should not compress if bufferBr already exists', async () => {
		const file = new File(mockName, mockBufferRaw);
		file.bufferBr = Buffer.from('already-compressed');

		await file.compress();

		expect(cache).not.toHaveBeenCalled();
		expect(brotliCompress).not.toHaveBeenCalled();
	});

	it('should compress the buffer and cache the result', async () => {
		const file = new File(mockName, mockBufferRaw);

		await file.compress();

		expect(cache).toHaveBeenCalledWith('compress', file.contentHash, expect.any(Function));
		expect(brotliCompress).toHaveBeenCalledWith(
			mockBufferRaw,
			{
				params: {
					[constants.BROTLI_PARAM_QUALITY]: 11,
					[constants.BROTLI_PARAM_SIZE_HINT]: mockBufferRaw.length,
				},
			},
			expect.any(Function)
		);
		expect(file.bufferBr).toEqual(Buffer.from('compressed-data'));
	});

	it('should key the cache on content alone, so duplicates under other names hit it', async () => {
		// The build repeats one empty glyph range under tens of thousands of names. Including
		// the name in the key would compress and store every one of them separately.
		const a = new File('fira_sans_black/10240-10495.pbf', Buffer.from('raw-data'));
		const b = new File('noto_sans_italic/58880-59135.pbf', Buffer.from('raw-data'));

		await a.compress();
		await b.compress();

		const keys = vi.mocked(cache).mock.calls.map(([, key]) => key);
		expect(keys).toStrictEqual([a.contentHash, a.contentHash]);
	});

	it('should handle Brotli compression errors gracefully', async () => {
		vi.mocked(brotliCompress).mockImplementationOnce(((
			_buf: InputType,
			_options: BrotliOptions,
			callback: CompressCallback
		): void => {
			callback(new Error('Compression failed'), Buffer.alloc(0));
		}) as typeof brotliCompress);

		const file = new File(mockName, mockBufferRaw);

		await expect(file.compress()).rejects.toThrow();

		expect(file.bufferBr).toBeUndefined();
	});
});
