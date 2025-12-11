import { vi, describe, it, expect } from 'vitest';
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
	const mockModificationTime = 123456789;
	const mockBufferRaw = Buffer.from('raw-data');

	it('should initialize with the correct properties', () => {
		const file = new File(mockName, mockModificationTime, mockBufferRaw);

		expect(file.name).toBe(mockName);
		expect(file.hash).toBe(`${mockName};${mockModificationTime};${mockBufferRaw.length}`);
		expect(file.bufferRaw).toBe(mockBufferRaw);
		expect(file.bufferBr).toBeUndefined();
	});

	it('should not compress if bufferBr already exists', async () => {
		const file = new File(mockName, mockModificationTime, mockBufferRaw);
		file.bufferBr = Buffer.from('already-compressed');

		await file.compress();

		expect(cache).not.toHaveBeenCalled();
		expect(brotliCompress).not.toHaveBeenCalled();
	});

	it('should compress the buffer and cache the result', async () => {
		const file = new File(mockName, mockModificationTime, mockBufferRaw);

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

		const file = new File(mockName, mockModificationTime, mockBufferRaw);

		await expect(file.compress()).rejects.toThrow();

		expect(file.bufferBr).toBeUndefined();
	});
});
