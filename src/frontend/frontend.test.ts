import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FrontendConfig } from './frontend';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { execFileSync } from 'child_process';
import { gunzipSync, zstdDecompressSync } from 'zlib';
import tar from 'tar-stream';
import { FileDB } from '../files/filedb';
import { emptyGlyphPbf } from '../files/glyphs';

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

	it('should create zstd tarball', async () => {
		const frontend = new Frontend(mockFileDBs, testConfig);

		await frontend.saveAsTarZst('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.tar.zst');
	});

	describe('hardlinks', () => {
		const content = Buffer.from('duplicated content');

		function createFrontend(hardlinks?: boolean): InstanceType<typeof Frontend> {
			const dbs = new FileDBs({ all: {}, extra: {} });
			dbs.get('all').setFileFromBuffer('a/first.txt', content);
			dbs.get('all').setFileFromBuffer('empty1.txt', Buffer.alloc(0));
			dbs.get('all').setFileFromBuffer('empty2.txt', Buffer.alloc(0));
			// Same content from another fileDB, in a separate buffer.
			dbs.get('extra').setFileFromBuffer('b/second.txt', Buffer.from(content));
			dbs.get('extra').setFileFromBuffer('unique.txt', Buffer.from('unique'));
			return new Frontend(dbs, { name: 'links', description: 'Links frontend.', fileDBs: ['all', 'extra'], hardlinks });
		}

		// The path of the temporary file the mocked createWriteStream wrote the tarball to.
		function writtenTarball(): string {
			return vi.mocked(createWriteStream).mock.results[0].value.path;
		}

		async function listEntries(filename: string): Promise<Record<string, string>> {
			const { readFileSync } = await vi.importActual<typeof import('fs')>('fs');
			const compressed = readFileSync(filename);
			// The temporary file has no meaningful extension, so detect gzip by its magic bytes.
			const isGzip = compressed[0] === 0x1f && compressed[1] === 0x8b;
			const entries: Record<string, string> = {};
			const extract = tar.extract();
			extract.end(isGzip ? gunzipSync(compressed) : zstdDecompressSync(compressed));
			for await (const entry of extract) {
				const { name, type, linkname } = entry.header;
				entries[name] = type === 'link' ? `link -> ${linkname}` : type;
				entry.resume();
			}
			return entries;
		}

		it('always writes duplicated content as link entries into the .tar.zst bundle', async () => {
			// No hardlinks flag: .tar.zst readers support links, so the bundle uses them anyway.
			await createFrontend().saveAsTarZst('/tmp/');
			expect(await listEntries(writtenTarball())).toStrictEqual({
				'a/first.txt': 'file',
				'empty1.txt': 'file',
				'empty2.txt': 'file',
				'b/second.txt': 'link -> a/first.txt',
				'unique.txt': 'file',
			});
		});

		it('writes duplicated content as link entries', async () => {
			await createFrontend(true).saveAsTarGz('/tmp/');
			expect(await listEntries(writtenTarball())).toStrictEqual({
				'a/first.txt': 'file',
				'empty1.txt': 'file',
				'empty2.txt': 'file',
				'b/second.txt': 'link -> a/first.txt',
				'unique.txt': 'file',
			});
		});

		it('links .br entries to the first .br entry with the same raw content', async () => {
			await createFrontend(true).saveAsBrTarGz('/tmp/');
			expect(await listEntries(writtenTarball())).toStrictEqual({
				'a/first.txt.br': 'file',
				'empty1.txt.br': 'file',
				'empty2.txt.br': 'file',
				'b/second.txt.br': 'link -> a/first.txt.br',
				'unique.txt.br': 'file',
			});
		});

		it('writes only regular files by default', async () => {
			await createFrontend().saveAsTarGz('/tmp/');
			expect(Object.values(await listEntries(writtenTarball())).every((type) => type === 'file')).toBe(true);
		});

		it('recreates both files when extracting', async () => {
			const fs = await vi.importActual<typeof import('fs')>('fs');
			await createFrontend(true).saveAsTarGz('/tmp/');
			const dir = fs.mkdtempSync(resolve(tmpdir(), 'hardlinks-'));
			try {
				execFileSync('tar', ['-xzf', writtenTarball(), '-C', dir]);
				expect(fs.readFileSync(resolve(dir, 'a/first.txt'))).toEqual(content);
				expect(fs.readFileSync(resolve(dir, 'b/second.txt'))).toEqual(content);
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it("keeps frontend-tiny's glyph transform working for ranges that share a buffer", async () => {
			const tiny = (await loadFrontendConfigs()).find((c) => c.name === 'frontend-tiny');
			if (!tiny?.transform) throw Error('frontend-tiny has no transform');

			// As loaded from a deduplicated fonts release: the italic ranges are links to the upright ones.
			const low = Buffer.from('glyphs 0-255');
			const high = Buffer.from('glyphs 19968-20223');
			const dbs = new FileDBs({ all: {} });
			const db = dbs.get('all');
			db.setFileFromBuffer('assets/glyphs/noto_sans_regular/0-255.pbf', low);
			db.setFileFromBuffer('assets/glyphs/noto_sans_regular_italic/0-255.pbf', low);
			db.setFileFromBuffer('assets/glyphs/noto_sans_regular/19968-20223.pbf', high);
			db.setFileFromBuffer('assets/glyphs/noto_sans_regular_italic/19968-20223.pbf', high);

			const frontend = new Frontend(dbs, { ...tiny, fileDBs: ['all'], hardlinks: true });
			const files = Object.fromEntries([...frontend.iterate()].map((f) => [f.name, f.bufferRaw]));
			expect(files['assets/glyphs/noto_sans_regular/19968-20223.pbf']).toEqual(
				emptyGlyphPbf('noto_sans_regular', '19968-20223')
			);
			expect(files['assets/glyphs/noto_sans_regular_italic/19968-20223.pbf']).toEqual(
				emptyGlyphPbf('noto_sans_regular_italic', '19968-20223')
			);

			await frontend.saveAsTarGz('/tmp/');
			expect(await listEntries(writtenTarball())).toStrictEqual({
				'assets/glyphs/noto_sans_regular/0-255.pbf': 'file',
				'assets/glyphs/noto_sans_regular_italic/0-255.pbf': 'link -> assets/glyphs/noto_sans_regular/0-255.pbf',
				// The empty replacement tiles differ per font, so they stay regular files.
				'assets/glyphs/noto_sans_regular/19968-20223.pbf': 'file',
				'assets/glyphs/noto_sans_regular_italic/19968-20223.pbf': 'file',
			});
		});
	});

	it('loads frontend configurations correctly', async () => {
		const configs = await loadFrontendConfigs();
		expect(configs).toContainEqual(expect.objectContaining({ name: expect.any(String), fileDBs: expect.any(Array) }));
	});

	it('should apply filter callback', () => {
		const filterFileDBs = new FileDBs({ all: {} });
		const allDB = filterFileDBs.get('all');
		allDB.setFileFromBuffer('keep.txt', Buffer.from('keep'));
		allDB.setFileFromBuffer('drop.txt', Buffer.from('drop'));
		allDB.setFileFromBuffer('also-keep.txt', Buffer.from('also-keep'));

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
		allDB.setFileFromBuffer('a.txt', Buffer.from('a'));
		allDB.setFileFromBuffer('b.log', Buffer.from('b'));
		allDB.setFileFromBuffer('c.txt', Buffer.from('c'));

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

	it('should apply transform callback to replace and drop files', async () => {
		const { File } = await import('../files/file');
		const dbs = new FileDBs({ all: {} });
		const allDB = dbs.get('all');
		allDB.setFileFromBuffer('keep.txt', Buffer.from('keep'));
		allDB.setFileFromBuffer('replace.txt', Buffer.from('original'));
		allDB.setFileFromBuffer('drop.txt', Buffer.from('gone'));

		const transformConfig: FrontendConfig = {
			name: 'transformed',
			description: 'Transformed frontend.',
			fileDBs: ['all'],
			transform: (file) => {
				if (file.name === 'drop.txt') return null;
				if (file.name === 'replace.txt') return new File(file.name, Buffer.from('replaced'));
				return file;
			},
		};

		const frontend = new Frontend(dbs, transformConfig);
		const files = [...frontend.iterate()].sort((a, b) => a.name.localeCompare(b.name));

		expect(files.map((f) => f.name)).toStrictEqual(['keep.txt', 'replace.txt']);
		expect(files.find((f) => f.name === 'replace.txt')?.bufferRaw).toEqual(Buffer.from('replaced'));
		// getFile() applies the same rewrite, keeping the dev server consistent with the tarball.
		expect(frontend.getFile('replace.txt')).toEqual(Buffer.from('replaced'));
		expect(frontend.getFile('drop.txt')).toBeNull();
	});

	it('lets a later fileDB provide a name the first fileDB transformed to null', () => {
		const dbs = new FileDBs({ all: {}, extra: {} });
		dbs.get('all').setFileFromBuffer('shared.txt', Buffer.from('from-all'));
		dbs.get('extra').setFileFromBuffer('shared.txt', Buffer.from('from-extra'));

		const config: FrontendConfig = {
			name: 'transform-null',
			description: 'Transform-null frontend.',
			fileDBs: ['all', 'extra'],
			// Drop only the copy coming from the first fileDB.
			transform: (file) => (file.bufferRaw.equals(Buffer.from('from-all')) ? null : file),
		};

		const frontend = new Frontend(dbs, config);
		const files = [...frontend.iterate()];
		expect(files.map((f) => f.name)).toStrictEqual(['shared.txt']);
		expect(files[0].bufferRaw).toEqual(Buffer.from('from-extra'));
		expect(frontend.getFile('shared.txt')).toEqual(Buffer.from('from-extra'));
	});

	it('dedupes overlapping filenames first-wins across fileDBs', () => {
		const dbs = new FileDBs({ all: {}, extra: {} });
		dbs.get('all').setFileFromBuffer('shared.txt', Buffer.from('from-all'));
		dbs.get('all').setFileFromBuffer('only-all.txt', Buffer.from('a'));
		dbs.get('extra').setFileFromBuffer('shared.txt', Buffer.from('from-extra'));
		dbs.get('extra').setFileFromBuffer('only-extra.txt', Buffer.from('e'));

		const config: FrontendConfig = {
			name: 'dedupe',
			description: 'Dedupe frontend.',
			fileDBs: ['all', 'extra'],
		};

		const frontend = new Frontend(dbs, config);
		const files = [...frontend.iterate()];

		// 'shared.txt' appears once, and its buffer comes from the first fileDB ('all'),
		// consistent with getFile().
		expect(files.map((f) => f.name).sort()).toStrictEqual(['only-all.txt', 'only-extra.txt', 'shared.txt']);
		const shared = files.find((f) => f.name === 'shared.txt');
		expect(shared?.bufferRaw).toEqual(Buffer.from('from-all'));
		expect(frontend.getFile('shared.txt')).toEqual(Buffer.from('from-all'));
	});

	it('generates frontends', async () => {
		await PromiseFunction.run(await generateFrontends(mockFileDBs, '/tmp/'));

		expect(createWriteStream).toHaveBeenCalledTimes(15);

		const calledFilenames = vi
			.mocked(createWriteStream)
			.mock.calls.map((call) => String(call[0]))
			.sort();
		expect(calledFilenames).toStrictEqual([
			'/tmp/frontend-blank.br.tar.gz',
			'/tmp/frontend-blank.tar.gz',
			'/tmp/frontend-blank.tar.zst',
			'/tmp/frontend-dev.br.tar.gz',
			'/tmp/frontend-dev.tar.gz',
			'/tmp/frontend-dev.tar.zst',
			'/tmp/frontend-min.br.tar.gz',
			'/tmp/frontend-min.tar.gz',
			'/tmp/frontend-min.tar.zst',
			'/tmp/frontend-tiny.br.tar.gz',
			'/tmp/frontend-tiny.tar.gz',
			'/tmp/frontend-tiny.tar.zst',
			'/tmp/frontend.br.tar.gz',
			'/tmp/frontend.tar.gz',
			'/tmp/frontend.tar.zst',
		]);
	});
});
