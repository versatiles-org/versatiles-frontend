/* eslint-disable @typescript-eslint/consistent-type-imports */

import type { } from '../utils';
import { jest } from '@jest/globals';

export const mockUtils = {
	cleanupFolder: jest.fn().mockReturnValue(undefined),
	ensureFolder: jest.fn().mockReturnValue(undefined),
	streamAsBuffer: jest.fn().mockReturnValue(Promise.resolve(Buffer.from('mocked Buffer'))),
	getLatestReleaseVersion: jest.fn().mockReturnValue(Promise.resolve('1.2.3')),
} as unknown as jest.Mocked<typeof import('../utils')>;
