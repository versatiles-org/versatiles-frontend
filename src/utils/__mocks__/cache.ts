import { jest } from '@jest/globals';

export const cache = jest.fn(async (action: string, key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
	return cbBuffer();
});

const mockedModule = {
	cache
}

try { jest.unstable_mockModule('./cache', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../cache', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./utils/cache', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../utils/cache', () => mockedModule) } catch (_) { /* */ }
