import { vi, describe, it, expect } from 'vitest';
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
	const expectedHash = mockName + ';' + createHash('sha256').update(mockBufferRaw).digest('hex');

	it('should initialize with the correct properties', () => {
		const file = new File(mockName, mockBufferRaw);

		expect(file.name).toBe(mockName);
		expect(file.hash).toBe(expectedHash);
		expect(file.bufferRaw).toBe(mockBufferRaw);
		expect(file.bufferBr).toBeUndefined();
	});

	it('should produce a stable hash for identical content regardless of identity', () => {
		const a = new File(mockName, Buffer.from('raw-data'));
		const b = new File(mockName, Buffer.from('raw-data'));

		expect(a.hash).toBe(b.hash);
	});

	it('should produce different hashes for different content', () => {
		const a = new File(mockName, Buffer.from('one'));
		const b = new File(mockName, Buffer.from('two'));

		expect(a.hash).not.toBe(b.hash);
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

		expect(cache).toHaveBeenCalledWith('compress', file.hash, expect.any(Function));
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
