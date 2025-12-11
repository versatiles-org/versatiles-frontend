import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FrontendConfig } from './frontend';
import { tmpdir } from 'os';
import { resolve } from 'path';

// Mock cache module
vi.mock('../utils/cache', () => ({
	cache: vi.fn(async (_action: string, _key: string, cbBuffer: () => Promise<Buffer>) => cbBuffer()),
}));

// Mock fs module
const createWriteStream = vi.fn();
vi.mock('fs', async (originalImport) => {
	const originalFs = await originalImport<typeof import('fs')>();

	createWriteStream.mockImplementation(() => {
		const filename = resolve(tmpdir(), Math.random().toString(36) + '.tmp');
		const stream = originalFs.createWriteStream(filename);
		return stream;
	});

	return {
		createReadStream: vi.fn(),
		createWriteStream,
		mkdirSync: vi.fn(),
		existsSync: vi.fn(),
		rmSync: vi.fn(),
	};
});

import { FileDBs } from '../files/__mocks__/filedbs';
import { progress, PromiseFunction } from '../async_progress';

const { loadFileDBConfigs } = await import('../files/filedbs');
const { Frontend } = await import('./frontend');
const { loadFrontendConfigs } = await import('./load');
const { generateFrontends } = await import('./generate');

progress.disable();

const fileDBConfig = await loadFileDBConfigs();

describe('Frontend class', () => {
	let mockFileDBs: InstanceType<typeof FileDBs>;
	const testConfig = {
		name: 'frontend',
		fileDBs: ['all'],
		ignore: ['ignore-me.txt'],
	} as const satisfies FrontendConfig;

	beforeEach(() => {
		vi.clearAllMocks(); // Clear mocks before each test
		mockFileDBs = new FileDBs(
			Object.fromEntries(
				Object.entries(fileDBConfig).map(([name, _config]) => {
					return [name, { [name + '.html']: 'html content of ' + name }];
				})
			)
		);
	});

	it('should create gzip-compressed tarball', async () => {
		const frontend = new Frontend(mockFileDBs, testConfig);

		await frontend.saveAsTarGz('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.tar.gz');
	});

	it('should create brotli tarball', async () => {
		const frontend = new Frontend(mockFileDBs, testConfig);

		await frontend.saveAsBrTarGz('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.br.tar.gz');
	});

	it('loads frontend configurations correctly', async () => {
		const configs = await loadFrontendConfigs();
		expect(configs).toContainEqual(expect.objectContaining({ name: expect.any(String), fileDBs: expect.any(Array) }));
	});

	it('generates frontends', async () => {
		await PromiseFunction.run(await generateFrontends(mockFileDBs, '/tmp/'));

		expect(createWriteStream).toHaveBeenCalledTimes(6);

		const calledFilenames = vi
			.mocked(createWriteStream)
			.mock.calls.map((call) => String(call[0]))
			.sort();
		expect(calledFilenames).toStrictEqual([
			'/tmp/frontend-dev.br.tar.gz',
			'/tmp/frontend-dev.tar.gz',
			'/tmp/frontend-min.br.tar.gz',
			'/tmp/frontend-min.tar.gz',
			'/tmp/frontend.br.tar.gz',
			'/tmp/frontend.tar.gz',
		]);
	});
});
