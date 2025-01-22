import { jest } from '@jest/globals';

export const mockReleaseVersion: jest.Mocked<typeof import('../release_version')> = {
  getLatestGithubReleaseVersion: jest.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(async () => '1.2.3'),
  getLatestNPMReleaseVersion: jest.fn<(packageName: string) => Promise<string>>(async () => '2.3.4'),
};

export const getLatestGithubReleaseVersion = mockReleaseVersion.getLatestGithubReleaseVersion;
export const getLatestNPMReleaseVersion = mockReleaseVersion.getLatestNPMReleaseVersion;

try { jest.unstable_mockModule('./release_version', () => mockReleaseVersion) } catch (e) { }
try { jest.unstable_mockModule('../release_version', () => mockReleaseVersion) } catch (e) { }
try { jest.unstable_mockModule('./utils/release_version', () => mockReleaseVersion) } catch (e) { }
try { jest.unstable_mockModule('../utils/release_version', () => mockReleaseVersion) } catch (e) { }
