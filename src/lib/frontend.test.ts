/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import { resolve } from 'path';
import type { File as FileType } from './file_system';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { cache } = await import('./__mocks__/cache');
const { createWriteStream } = (await import('./__mocks__/node_fs')).default;
const { File, FileSystem } = await import('./file_system');
const { Frontend, loadFrontendConfigs, generateFrontends } = await import('./frontend');
const progress = (await import('./progress')).default;
const PromiseFunction = (await import('./async')).default;
progress.disable();

if (!jest.isMockFunction(createWriteStream)) throw Error();

const projectFolder = new URL('../../', import.meta.url).pathname;

describe('Frontend class', () => {
	const mockFileSystem = new FileSystem(new Map<string, FileType>([
		['nothing.js', new File('nothing.js', 12, Buffer.from('empty'))],
	]));
	const testConfig = {
		name: 'frontend',
		include: ['all', 'frontend'],
		ignore: ['ignore-me.txt'],
	};
	const frontendsPath = resolve(projectFolder, 'frontends');

	beforeEach(() => {
		jest.clearAllMocks(); // Clear mocks before each test
	});

	it('should create gzip-compressed tarball', async () => {
		const frontend = new Frontend(mockFileSystem, testConfig, frontendsPath);

		await frontend.saveAsTarGz(projectFolder);

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream.mock.calls[0][0]).toMatch(/\/versatiles-frontend\/frontend\.tar\.gz$/);
	});

	it('should create brotli tarball', async () => {
		const frontend = new Frontend(mockFileSystem, testConfig, frontendsPath);

		await frontend.saveAsBrTar(projectFolder);

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream.mock.calls[0][0]).toMatch(/\/versatiles-frontend\/frontend\.br\.tar$/);
	});

	it('loads frontend configurations correctly', () => {
		const configs = loadFrontendConfigs(frontendsPath);
		expect(configs).toContainEqual(expect.objectContaining(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			{ name: expect.any(String), include: expect.any(Array) },
		));
	});

	it('calls getLatestReleaseVersion with correct arguments for assets', async () => {
		await PromiseFunction.run(generateFrontends(mockFileSystem, projectFolder, '/tmp'));
	});
});
