 
 

import { jest } from '@jest/globals';

const instance = {
	get: jest.fn(async (): Promise<string> => Promise.resolve('get')),
	put: jest.fn(async (): Promise<void> => Promise.resolve()),
};

export const mockClassicLevel = {
	ClassicLevel: jest.fn(() => instance),
} as unknown as jest.Mocked<typeof import('classic-level')>;
