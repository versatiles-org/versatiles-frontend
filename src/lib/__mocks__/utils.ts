import type { } from '../utils';
import { jest } from '@jest/globals';

jest.unstable_mockModule('./utils', () => ({
	cleanupFolder: jest.fn<typeof cleanupFolder>().mockReturnValue(Promise.resolve()),
	copyRecursive: jest.fn<typeof copyRecursive>().mockReturnValue(Promise.resolve()),
	ensureFolder: jest.fn<typeof ensureFolder>().mockReturnValue(),
	streamAsBuffer: jest.fn<typeof streamAsBuffer>().mockReturnValue(Promise.resolve(Buffer.from('mocked Buffer'))),
	getLatestReleaseVersion: jest.fn<typeof getLatestReleaseVersion>().mockReturnValue(Promise.resolve('1.2.3')),
}));

const { cleanupFolder, copyRecursive, ensureFolder, streamAsBuffer, getLatestReleaseVersion } = await import('../utils');

export { cleanupFolder, copyRecursive, ensureFolder, streamAsBuffer, getLatestReleaseVersion };