/* eslint-disable @typescript-eslint/promise-function-async */
/* eslint-disable @typescript-eslint/consistent-type-imports */

import { jest } from '@jest/globals';

export const mockReleaseVersion: jest.Mocked<typeof import('../release_version')> = {
	getLatestReleaseVersion: jest.fn<(owner: string, repo: string) => Promise<string>>(() => Promise.resolve('1.2.3')),
};
