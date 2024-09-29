 

import { jest } from '@jest/globals';

export const mockCache: jest.Mocked<typeof import('../cache')> = {
	cache: jest.fn(async (key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
		return cbBuffer();
	}),
};
