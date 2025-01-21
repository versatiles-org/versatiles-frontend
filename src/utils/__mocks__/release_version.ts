import { jest } from '@jest/globals';

export const mockReleaseVersion: jest.Mocked<typeof import('../release_version')> = {
	getLatestGithubReleaseVersion: jest.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(() => Promise.resolve('1.2.3')),
	getLatestNPMReleaseVersion: jest.fn<(packageName: string) => Promise<string>>(() => Promise.resolve('2.3.4')),
};
