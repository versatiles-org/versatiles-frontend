import { jest } from '@jest/globals';

export const mockCache: jest.Mocked<typeof import('../cache')> = {
	cache: jest.fn(async (action: string, key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> => {
		return cbBuffer();
	}),
};

try { jest.unstable_mockModule('../cache', () => mockCache) } catch (e) { }
try { jest.unstable_mockModule('./cache', () => mockCache) } catch (e) { }
try { jest.unstable_mockModule('./utils/cache', () => mockCache) } catch (e) { }
