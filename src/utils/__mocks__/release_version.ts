import { jest } from '@jest/globals';

export const mockReleaseVersion: jest.Mocked<typeof import('../release_version')> = {
	getLatestGithubReleaseVersion: jest.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(() => Promise.resolve('1.2.3')),
	getLatestNPMReleaseVersion: jest.fn<(packageName: string) => Promise<string>>(() => Promise.resolve('2.3.4')),
};

export const getLatestGithubReleaseVersion = mockReleaseVersion.getLatestGithubReleaseVersion;
export const getLatestNPMReleaseVersion = mockReleaseVersion.getLatestNPMReleaseVersion;

jest.unstable_mockModule('../utils/release_version', () => mockReleaseVersion);
