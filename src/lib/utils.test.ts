import { jest } from '@jest/globals';
import { mockFetchResponse } from './__mocks__/global_fetch';

const { existsSync, mkdirSync, rmSync } = await import('./__mocks__/node_fs');

const utils = await import('./utils');


describe('cleanupFolder', () => {
	it('should remove and recreate the folder', () => {
		jest.clearAllMocks();

		existsSync
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

		existsSync
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

describe('getLatestReleaseVersion', () => {
	it('fetches the latest release version', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		// eslint-disable-next-line @typescript-eslint/naming-convention
		mockFetchResponse([{ tag_name: 'v12.7.3' }]);

		const version = await utils.getLatestReleaseVersion(owner, repo);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/releases`, expect.anything());
	});
});
