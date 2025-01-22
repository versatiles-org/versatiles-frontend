import { jest } from '@jest/globals';

export const cleanupFolder = jest.fn().mockReturnValue(undefined);
export const ensureFolder = jest.fn().mockReturnValue(undefined);

export const mockUtils = {
  cleanupFolder,
  ensureFolder,
} as const satisfies jest.Mocked<typeof import('../utils')>;

try { jest.unstable_mockModule('../utils', () => mockUtils) } catch (e) { }
try { jest.unstable_mockModule('./utils', () => mockUtils) } catch (e) { }
try { jest.unstable_mockModule('./utils/utils', () => mockUtils) } catch (e) { }
