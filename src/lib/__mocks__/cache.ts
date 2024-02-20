import { jest } from '@jest/globals';

jest.unstable_mockModule('./cache.js', () => ({
	'default': async (key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
		return cbBuffer();
	},
}));

const cache = (await import('../cache.js')).default;

export default cache;
