import { jest } from '@jest/globals';

const { mockFs } = await import('./__mocks__/node_fs');
jest.unstable_mockModule('node:fs', () => mockFs);
const { existsSync, mkdirSync, rmSync } = await import('node:fs');

const utils = await import('./utils');


describe('cleanupFolder', () => {
	it('should remove and recreate the folder', () => {
		jest.clearAllMocks();

		jest.mocked(existsSync)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);

		utils.cleanupFolder('/test/folder');

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
		jest.clearAllMocks();

		jest.mocked(existsSync)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);

		utils.ensureFolder('/test/folder');

		expect(existsSync).toHaveBeenCalledTimes(2);
		expect(existsSync).toHaveBeenNthCalledWith(1, '/test/folder');
		expect(existsSync).toHaveBeenNthCalledWith(2, '/test');
		expect(mkdirSync).toHaveBeenCalledTimes(1);
		expect(mkdirSync).toHaveBeenCalledWith('/test/folder');
	});
});

import { Readable } from 'node:stream';

describe('streamAsBuffer', () => {
	it('converts a readable stream to a buffer', async () => {
		const mockStream = Readable.from(['hello', ' ', 'world'].map(s => Buffer.from(s)));
		const result = await utils.streamAsBuffer(mockStream);

		expect(result.toString()).toBe('hello world');
	});
});
