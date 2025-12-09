import { Mocked, vi } from 'vitest';

export const cleanupFolder = vi.fn().mockReturnValue(undefined);
export const ensureFolder = vi.fn().mockReturnValue(undefined);

export const mockUtils = {
  cleanupFolder,
  ensureFolder,
} as const satisfies Mocked<typeof import('../utils')>;

try { vi.mock('../utils', () => mockUtils) } catch (_) { /* */ }
try { vi.mock('./utils', () => mockUtils) } catch (_) { /* */ }
try { vi.mock('./utils/utils', () => mockUtils) } catch (_) { /* */ }
