import { jest } from '@jest/globals';

export const mockReleaseVersion: jest.Mocked<typeof import('../release_version')> = {
	getLatestReleaseVersion: jest.fn<(owner: string, repo: string) => Promise<string>>(() => Promise.resolve('1.2.3')),
};
