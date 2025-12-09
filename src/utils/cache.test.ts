import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fs and path modules
vi.mock('fs', () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}));
vi.mock('path', () => ({
	resolve: vi.fn((...args: string[]) => args.join('/')),
}));
vi.mock('./utils.js', () => ({
	ensureFolder: vi.fn(),
}));

const { cache } = await import('./cache.js');
const fs = await import('fs');

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

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key$/));
		expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key$/));
		expect(result).toBe(mockBuffer);
	});

	it('should call the callback, cache the result, and return it if the key does not exist', async () => {
		const mockBuffer = Buffer.from('generated data');
		vi.mocked(fs.existsSync).mockReturnValue(false);

		const result = await cache('action', 'key', async () => mockBuffer);

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key$/));
		expect(fs.readFileSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key$/), mockBuffer);
		expect(result).toBe(mockBuffer);
	});

	it('should throw an error if the callback does not return a Buffer', async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);

		await expect(cache('action', 'key', async () => 'not a buffer' as unknown as Buffer)).rejects.toThrow(
			'The callback function must return a Buffer'
		);

		expect(fs.existsSync).toHaveBeenCalledWith(expect.stringMatching(/\/action\/key$/));
		expect(fs.readFileSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it('should correctly sanitize the filename derived from the key', async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const mockBuffer = Buffer.from('data');
		await cache('äçtion', 'key/with special@chars', async () => mockBuffer);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/x228_x231_tion\/key_x47_with_special_x64_chars$/),
			mockBuffer
		);
	});
});
