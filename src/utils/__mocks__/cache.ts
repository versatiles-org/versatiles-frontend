

import { jest } from '@jest/globals';

export const mockCache: jest.Mocked<typeof import('../cache')> = {
	cache: jest.fn(async (action: string, key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
		return cbBuffer();
	}),
};
