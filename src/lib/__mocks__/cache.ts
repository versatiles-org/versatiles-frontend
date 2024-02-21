import { jest } from '@jest/globals';

jest.unstable_mockModule('./cache', () => ({
	cache: jest.fn(async (key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
		return cbBuffer();
	}),
}));

const { cache } = await import('../cache');

if (!jest.isMockFunction(cache)) throw Error();

export { cache };
