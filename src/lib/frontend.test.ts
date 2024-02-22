/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import { resolve } from 'path';
import type { FileSystem as FileSystemType, File as FileType } from './file_system';

const { mockCache } = await import('./__mocks__/cache');
jest.unstable_mockModule('./cache', () => mockCache);
const { } = await import('./cache');

const { mockFs } = await import('./__mocks__/node_fs');
jest.unstable_mockModule('node:fs', () => mockFs);
const { createWriteStream } = await import('node:fs');

const { File, FileSystem } = await import('./file_system');
const { Frontend, loadFrontendConfigs, generateFrontends } = await import('./frontend');
const progress = (await import('./progress')).default;
const PromiseFunction = (await import('./async')).default;

progress.disable();

if (!jest.isMockFunction(createWriteStream)) throw Error();

const projectFolder = new URL('../../', import.meta.url).pathname;

describe('Frontend class', () => {
	let mockFileSystem: FileSystemType;
	const testConfig = {
		name: 'frontend',
		include: ['all', 'frontend'],
		ignore: ['ignore-me.txt'],
	};
	const frontendsPath = resolve(projectFolder, 'frontends');

	beforeEach(() => {
		jest.clearAllMocks(); // Clear mocks before each test
		mockFileSystem = new FileSystem(new Map<string, FileType>([
			['nothing.js', new File('nothing.js', 12, Buffer.from('file content'))],
		]));
	});

	it('should create gzip-compressed tarball', async () => {
		const frontend = new Frontend(mockFileSystem, testConfig, frontendsPath);

		await frontend.saveAsTarGz('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.tar.gz');
	});

	it('should create brotli tarball', async () => {
		const frontend = new Frontend(mockFileSystem, testConfig, frontendsPath);

		await frontend.saveAsBrTar('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.br.tar');
	});

	it('loads frontend configurations correctly', () => {
		const configs = loadFrontendConfigs(frontendsPath);
		expect(configs).toContainEqual(expect.objectContaining(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			{ name: expect.any(String), include: expect.any(Array) },
		));
	});

	it('generates frontends', async () => {
		await PromiseFunction.run(generateFrontends(mockFileSystem, projectFolder, '/tmp'));

		expect(createWriteStream).toHaveBeenCalledTimes(6);

		const calledFilenames = createWriteStream.mock.calls.map(call => call[0] as string).sort();
		expect(calledFilenames).toStrictEqual([
			'/tmp/frontend-minimal.br.tar',
			'/tmp/frontend-minimal.tar.gz',
			'/tmp/frontend-rust.br.tar',
			'/tmp/frontend-rust.tar.gz',
			'/tmp/frontend.br.tar',
			'/tmp/frontend.tar.gz',
		]);
	});
});
