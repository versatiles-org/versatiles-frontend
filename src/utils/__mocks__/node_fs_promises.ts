 

import { jest } from '@jest/globals';

const originalFs = await import('node:fs/promises');

export const mockFsPromises = {
	...originalFs.default,
	readdir: jest.fn(originalFs.default.readdir),
	rm: jest.fn().mockReturnValue(undefined),
	stat: jest.fn(originalFs.default.stat),
} as unknown as jest.Mocked<typeof import('node:fs/promises')>;
