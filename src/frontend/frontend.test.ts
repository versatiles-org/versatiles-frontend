import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FrontendConfig } from './frontend';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { FileDB } from '../files/filedb';

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
		writeFileSync: vi.fn(),
		mkdirSync: vi.fn(),
		existsSync: vi.fn(),
		rmSync: vi.fn(),
	};
});

// Mock filedbs module
const FileDBs = vi.fn();
vi.mock('../files/filedbs', async (importOriginal) => {
	const original = await importOriginal<typeof import('../files/filedbs')>();
	const BaseFileDBs = original.FileDBs;

	class MockFileDBs extends BaseFileDBs {
		constructor(testFileDBs?: Record<string, Record<string, string>>) {
			super();
			if (testFileDBs) {
				Object.entries(testFileDBs).forEach(([name, testFiles]) => {
					// @ts-expect-error - override for testing
					this.fileDBs.set(name, new FileDB(testFiles));
				});
			}
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	FileDBs.mockImplementation(function (testFileDBs?: Record<string, Record<string, string>>) {
		return new MockFileDBs(testFileDBs);
	});

	// Wrap the original loader functions in vi.fn so tests can assert on calls
	const loadSourceConfigs = vi.fn(original.loadSourceConfigs);
	const loadFileDBs = vi.fn(original.loadFileDBs);

	return {
		...original,
		FileDBs,
		loadSourceConfigs,
		loadFileDBs,
	};
});

import { progress, PromiseFunction } from '../async_progress';

const { loadSourceConfigs } = await import('../files/filedbs');
const { Frontend } = await import('./frontend');
const { loadFrontendConfigs } = await import('./load');
const { generateFrontends } = await import('./generate');

progress.disable();

const fileDBConfig = await loadSourceConfigs();

describe('Frontend class', () => {
	let mockFileDBs: InstanceType<typeof FileDBs>;
	const testConfig = {
		name: 'frontend',
		description: 'Test frontend.',
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

	it('should apply filter callback', () => {
		const filterFileDBs = new FileDBs({ all: {} });
		const allDB = filterFileDBs.get('all');
		allDB.setFileFromBuffer('keep.txt', 0, Buffer.from('keep'));
		allDB.setFileFromBuffer('drop.txt', 0, Buffer.from('drop'));
		allDB.setFileFromBuffer('also-keep.txt', 0, Buffer.from('also-keep'));

		const filterConfig: FrontendConfig = {
			name: 'filtered',
			description: 'Filtered frontend.',
			fileDBs: ['all'],
			filter: (filename: string) => !filename.startsWith('drop'),
		};

		const frontend = new Frontend(filterFileDBs, filterConfig);
		const files = [...frontend.iterate()].map((f) => f.name).sort();
		expect(files).toStrictEqual(['also-keep.txt', 'keep.txt']);
	});

	it('should combine filter with ignore patterns', () => {
		const filterFileDBs = new FileDBs({ all: {} });
		const allDB = filterFileDBs.get('all');
		allDB.setFileFromBuffer('a.txt', 0, Buffer.from('a'));
		allDB.setFileFromBuffer('b.log', 0, Buffer.from('b'));
		allDB.setFileFromBuffer('c.txt', 0, Buffer.from('c'));

		const filterConfig: FrontendConfig = {
			name: 'combo',
			description: 'Combo frontend.',
			fileDBs: ['all'],
			ignore: ['*.log'],
			filter: (filename: string) => filename !== 'c.txt',
		};

		const frontend = new Frontend(filterFileDBs, filterConfig);
		const files = [...frontend.iterate()].map((f) => f.name).sort();
		expect(files).toStrictEqual(['a.txt']);
	});

	it('generates frontends', async () => {
		await PromiseFunction.run(await generateFrontends(mockFileDBs, '/tmp/'));

		expect(createWriteStream).toHaveBeenCalledTimes(8);

		const calledFilenames = vi
			.mocked(createWriteStream)
			.mock.calls.map((call) => String(call[0]))
			.sort();
		expect(calledFilenames).toStrictEqual([
			'/tmp/frontend-dev.br.tar.gz',
			'/tmp/frontend-dev.tar.gz',
			'/tmp/frontend-min.br.tar.gz',
			'/tmp/frontend-min.tar.gz',
			'/tmp/frontend-tiny.br.tar.gz',
			'/tmp/frontend-tiny.tar.gz',
			'/tmp/frontend.br.tar.gz',
			'/tmp/frontend.tar.gz',
		]);
	});
});
