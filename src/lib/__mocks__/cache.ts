import { jest } from '@jest/globals';

jest.unstable_mockModule('./cache', () => ({
	'default': async (key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
		return cbBuffer();
	},
}));

const cache = (await import('../cache')).default;

export default cache;
