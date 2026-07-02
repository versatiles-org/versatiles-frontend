import { vi, describe, it, expect } from 'vitest';

// Mock fs module
vi.mock('fs', () => ({
	createReadStream: vi.fn(),
	createWriteStream: vi.fn(),
	mkdirSync: vi.fn(),
	existsSync: vi.fn(),
	rmSync: vi.fn(),
}));

import { existsSync, mkdirSync, rmSync } from 'fs';
import { cleanupFolder, ensureFolder } from './utils';

describe('cleanupFolder', () => {
	it('should remove and recreate the folder', () => {
		vi.clearAllMocks();

		vi.mocked(existsSync).mockReturnValue(true);

		cleanupFolder('/test/folder');

		expect(existsSync).toHaveBeenCalledTimes(1);
		expect(existsSync).toHaveBeenCalledWith('/test/folder');
		expect(rmSync).toHaveBeenCalledTimes(1);
		expect(rmSync).toHaveBeenCalledWith('/test/folder', { recursive: true, maxRetries: 3, retryDelay: 100 });
		expect(mkdirSync).toHaveBeenCalledTimes(1);
		expect(mkdirSync).toHaveBeenCalledWith('/test/folder', { recursive: true });
	});
});

describe('ensureFolder', () => {
	it('should create the folder and any missing parents', () => {
		vi.clearAllMocks();

		ensureFolder('/test/folder');

		expect(mkdirSync).toHaveBeenCalledTimes(1);
		expect(mkdirSync).toHaveBeenCalledWith('/test/folder', { recursive: true });
	});
});
