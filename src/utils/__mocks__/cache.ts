import { vi } from 'vitest';

export const cache = vi.fn(async (action: string, key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
	return cbBuffer();
});

const mockedModule = {
	cache
}

try { vi.mock('./cache', () => mockedModule) } catch (_) { /* */ }
try { vi.mock('../cache', () => mockedModule) } catch (_) { /* */ }
try { vi.mock('./utils/cache', () => mockedModule) } catch (_) { /* */ }
try { vi.mock('../utils/cache', () => mockedModule) } catch (_) { /* */ }
