import { vi, describe, it, expect } from 'vitest';
import './__mocks__/node_fs';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { cleanupFolder, ensureFolder } from './utils';

describe('cleanupFolder', () => {
	it('should remove and recreate the folder', () => {
		vi.clearAllMocks();

		vi.mocked(existsSync).mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);

		cleanupFolder('/test/folder');

		expect(existsSync).toHaveBeenCalledTimes(3);
		expect(existsSync).toHaveBeenNthCalledWith(1, '/test/folder');
		expect(existsSync).toHaveBeenNthCalledWith(2, '/test/folder');
		expect(existsSync).toHaveBeenNthCalledWith(3, '/test');
		expect(rmSync).toHaveBeenCalledTimes(1);
		expect(rmSync).toHaveBeenCalledWith('/test/folder', { recursive: true, maxRetries: 3, retryDelay: 100 });
		expect(mkdirSync).toHaveBeenCalledTimes(1);
		expect(mkdirSync).toHaveBeenCalledWith('/test/folder');
	});
});

describe('ensureFolder', () => {
	it('should create the folder if it does not exist', () => {
		vi.clearAllMocks();

		vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true);

		ensureFolder('/test/folder');

		expect(existsSync).toHaveBeenCalledTimes(2);
		expect(existsSync).toHaveBeenNthCalledWith(1, '/test/folder');
		expect(existsSync).toHaveBeenNthCalledWith(2, '/test');
		expect(mkdirSync).toHaveBeenCalledTimes(1);
		expect(mkdirSync).toHaveBeenCalledWith('/test/folder');
	});
});
