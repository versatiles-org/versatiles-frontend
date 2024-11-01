 
 
import { jest } from '@jest/globals';

const { mockClassicLevel } = await import('./__mocks__/classic-level');
jest.unstable_mockModule('classic-level', () => mockClassicLevel);
const { ClassicLevel } = await import('classic-level');

const { cache } = await import('./cache');

describe('cache', () => {
	// Mocked database instance for easier reference
	const mockedDB = new ClassicLevel('');

	beforeEach(() => {
		// Clear mock call history before each test
		jest.clearAllMocks();
	});

	it('retrieves a value from the cache if it exists', async () => {
		const testKey = 'testKey';
		const testValue = Buffer.from('testValue');

		jest.mocked(mockedDB.get).mockReturnValue(Promise.resolve(testValue));

		const result = await cache(testKey, async () => Promise.resolve(Buffer.from('newValue')));

		expect(mockedDB.get).toHaveBeenCalledWith(testKey);
		expect(result).toEqual(testValue);
		expect(mockedDB.put).not.toHaveBeenCalled();
	});

	it('caches and returns a new value if the key does not exist in the cache', async () => {
		const testKey = 'newKey';
		const newValue = Buffer.from('newValue');
		// Simulate a cache miss by throwing an error
		jest.mocked(mockedDB.get).mockRejectedValue(new Error('Key not found'));

		const result = await cache(testKey, async () => Promise.resolve(newValue));

		expect(mockedDB.get).toHaveBeenCalledWith(testKey);
		expect(mockedDB.put).toHaveBeenCalledWith(testKey, newValue);
		expect(result).toEqual(newValue);
	});

	it('throws an error if the callback does not return a Buffer', async () => {
		const testKey = 'invalidKey';

		// Simulate a cache miss
		jest.mocked(mockedDB.get).mockRejectedValue(new Error('Key not found'));

		await expect(cache(testKey, async () => Promise.resolve('notABuffer' as unknown as Buffer)))
			.rejects.toThrow('The callback function must return a Buffer');
	});
});
