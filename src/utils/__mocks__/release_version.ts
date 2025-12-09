import { vi, Mocked } from 'vitest';

export const mockReleaseVersion: Mocked<typeof import('../release_version')> = {
  getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(async () => '1.2.3'),
  getLatestNPMReleaseVersion: vi.fn<(packageName: string) => Promise<string>>(async () => '2.3.4'),
};

export const getLatestGithubReleaseVersion = mockReleaseVersion.getLatestGithubReleaseVersion;
export const getLatestNPMReleaseVersion = mockReleaseVersion.getLatestNPMReleaseVersion;

try { vi.mock('./release_version', () => mockReleaseVersion) } catch (_) { /* */ }
try { vi.mock('../release_version', () => mockReleaseVersion) } catch (_) { /* */ }
try { vi.mock('./utils/release_version', () => mockReleaseVersion) } catch (_) { /* */ }
try { vi.mock('../utils/release_version', () => mockReleaseVersion) } catch (_) { /* */ }
