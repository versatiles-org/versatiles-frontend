 

import type { } from '../utils';
import { jest } from '@jest/globals';

export const mockUtils = {
	cleanupFolder: jest.fn().mockReturnValue(undefined),
	ensureFolder: jest.fn().mockReturnValue(undefined),
} as unknown as jest.Mocked<typeof import('../utils')>;
