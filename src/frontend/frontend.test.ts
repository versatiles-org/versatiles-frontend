import { vi, describe, it, expect } from 'vitest';
import type { FrontendConfig } from './frontend';
import { FileDB } from '../sources';

// Mock filedbs module. Declared through vi.hoisted: the sources barrel imported above loads
// file-dbs, and with it the hoisted factory below, before the rest of this file runs.
const FileDBs = vi.hoisted(() => vi.fn());
vi.mock('../sources/file-dbs', async (importOriginal) => {
	const original = await importOriginal<typeof import('../sources/file-dbs')>();
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

	return {
		...original,
		FileDBs,
	};
});

const { frontendConfigs } = await import('../config');
const { Frontend } = await import('./frontend');

describe('Frontend class', () => {
	it('drops the italic faces from frontend-tiny', async () => {
		const tiny = frontendConfigs.find((c) => c.name === 'frontend-tiny');
		if (!tiny) throw Error('frontend-tiny not found');

		const dbs = new FileDBs({ all: {} });
		const db = dbs.get('all');
		db.setFileFromBuffer('assets/glyphs/noto_sans_regular/0-255.pbf', Buffer.from('upright'));
		db.setFileFromBuffer('assets/glyphs/noto_sans_regular_italic/0-255.pbf', Buffer.from('italic'));
		db.setFileFromBuffer('assets/glyphs/noto_sans_bold_italic/0-255.pbf', Buffer.from('italic'));
		db.setFileFromBuffer('assets/glyphs/index.json', Buffer.from(JSON.stringify(['a', 'a_italic'], null, 2)));
		db.setFileFromBuffer(
			'assets/glyphs/font_families.json',
			Buffer.from(
				JSON.stringify(
					[
						{
							name: 'Noto Sans',
							faces: [
								{ id: 'a', style: 'normal' },
								{ id: 'a_italic', style: 'italic' },
							],
						},
					],
					null,
					2
				) + '\n'
			)
		);

		const files = Object.fromEntries(
			[...new Frontend(dbs, { ...tiny, fileDBs: ['all'] }).iterate()].map((f) => [f.name, f.bufferRaw])
		);

		// No italic glyph ranges survive...
		expect(Object.keys(files).filter((name) => name.includes('_italic'))).toStrictEqual([]);
		expect(files['assets/glyphs/noto_sans_regular/0-255.pbf']).toEqual(Buffer.from('upright'));
		// ...and neither metadata file still advertises one, which would point clients at
		// ranges that are no longer served.
		expect(files['assets/glyphs/index.json'].toString('utf8')).not.toContain('italic');
		expect(files['assets/glyphs/font_families.json'].toString('utf8')).not.toContain('italic');
	});

	it('defines frontend configurations', () => {
		expect(frontendConfigs).toContainEqual(
			expect.objectContaining({ name: expect.any(String), fileDBs: expect.any(Array) })
		);
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

	it('should apply transform callback to replace and drop files', () => {
		const dbs = new FileDBs({ all: {} });
		const allDB = dbs.get('all');
		allDB.setFileFromBuffer('keep.txt', Buffer.from('keep'));
		allDB.setFileFromBuffer('replace.txt', Buffer.from('original'));
		allDB.setFileFromBuffer('drop.txt', Buffer.from('gone'));

		const transformConfig: FrontendConfig = {
			name: 'transformed',
			description: 'Transformed frontend.',
			fileDBs: ['all'],
			transform: (name, content) => {
				if (name === 'drop.txt') return null;
				if (name === 'replace.txt') return Buffer.from('replaced');
				return content;
			},
		};

		const frontend = new Frontend(dbs, transformConfig);
		const files = [...frontend.iterate()].sort((a, b) => a.name.localeCompare(b.name));

		// A kept file is the same File, so its precompressed brotli content is not lost.
		expect(files.find((f) => f.name === 'keep.txt')).toBe(allDB.files.get('keep.txt'));

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
			transform: (_name, content) => (content.equals(Buffer.from('from-all')) ? null : content),
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
});
