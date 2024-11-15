import { jest } from '@jest/globals';

// Mock node:fs and node:path modules
jest.unstable_mockModule('node:fs', () => ({
	existsSync: jest.fn(),
	mkdirSync: jest.fn(),
	readFileSync: jest.fn(),
	writeFileSync: jest.fn(),
}));
jest.unstable_mockModule('node:path', () => ({
	resolve: jest.fn((...args: string[]) => args.join('/')),
}));

const { cache } = await import('./cache.js');
const fs = await import('node:fs');

describe('cache function', () => {
	beforeEach(() => {
		// Clear mocks before each test
		jest.clearAllMocks();
	});

	it('should retrieve a value from cache if it exists', async () => {
		const mockBuffer = Buffer.from('cached data');
		(fs.existsSync as jest.Mock).mockReturnValue(true);
		(fs.readFileSync as jest.Mock).mockReturnValue(mockBuffer);

		const key = 'test-key';
		const result = await cache(key, async () => {
			throw new Error('Callback should not be called when the key exists');
		});

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('test-key'));
		expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('test-key'));
		expect(result).toBe(mockBuffer);
	});

	it('should call the callback, cache the result, and return it if the key does not exist', async () => {
		const mockBuffer = Buffer.from('generated data');
		(fs.existsSync as jest.Mock).mockReturnValue(false);

		const key = 'new-key';
		const result = await cache(key, async () => mockBuffer);

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('new-key'));
		expect(fs.readFileSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining('new-key'),
			mockBuffer
		);
		expect(result).toBe(mockBuffer);
	});

	it('should throw an error if the callback does not return a Buffer', async () => {
		(fs.existsSync as jest.Mock).mockReturnValue(false);

		const key = 'invalid-key';
		await expect(cache(key, async () => 'not a buffer' as unknown as Buffer)).rejects.toThrow(
			'The callback function must return a Buffer'
		);

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('invalid-key'));
		expect(fs.readFileSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it('should correctly sanitize the filename derived from the key', async () => {
		(fs.existsSync as jest.Mock).mockReturnValue(false);
		const mockBuffer = Buffer.from('data');
		const key = 'key/with special@chars';
		await cache(key, async () => mockBuffer);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining('key_x47_with_x32_special_x64_chars'),
			mockBuffer
		);
	});
});
