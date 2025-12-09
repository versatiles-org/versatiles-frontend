import { vi, describe, it, expect, afterAll } from 'vitest';
import type { StaticFileDBConfig } from './filedb-static';

vi.mock('fs', () => {
	const mockFileSystem = new Map<string, string | false>([
		['/test/path', false],
		['/test/path/file1.txt', 'Content of file1'],
		['/test/path/file2.txt', 'Content of file2'],
		['/test/path/subdir', false],
		['/test/path/subdir/file3.txt', 'Content of file3'],
	]);

	return {
		existsSync: vi.fn(path => mockFileSystem.has(String(path))),
		mkdirSync: vi.fn(),
		rmSync: vi.fn(),
		readdirSync: vi.fn((path: string) => {
			return Array.from(mockFileSystem.keys())
				.filter(key => key.startsWith(String(path) + '/'))
				.map(key => key.slice(String(path).length + 1).split('/')[0]);
		}),
		readFileSync: vi.fn(path => Buffer.from(mockFileSystem.get(String(path)) || '')),
		statSync: vi.fn((path: string) => ({
			isDirectory: () => mockFileSystem.get(String(path)) === false,
			isFile: () => mockFileSystem.has(String(path)),
			mtimeMs: 1234567890,
			atime: new Date(),
			mtime: new Date(),
			ctime: new Date(),
			birthtime: new Date(),
		})),
		watch: vi.fn(() => ({
			close: vi.fn(),
			ref: vi.fn(),
			unref: vi.fn(),
			addListener: vi.fn(),
			on: vi.fn(),
			removeListener: vi.fn(),
		})),
		writeFileSync: vi.fn(),
	};
});

const fs = await import('fs');
const { StaticFileDB } = await import('./filedb-static');

describe('StaticFileDB', () => {
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('build() should correctly populate the database', async () => {
		const config: StaticFileDBConfig = { type: 'static', path: '/test/path' };
		const db = await StaticFileDB.build(config, '/');

		expect(db.getFile('file1.txt')).toEqual(Buffer.from('Content of file1'));
		expect(db.getFile('file2.txt')).toEqual(Buffer.from('Content of file2'));
		expect(db.getFile('subdir/file3.txt')).toEqual(Buffer.from('Content of file3'));
	});

	it('build() should throw an error if path does not exist', async () => {
		const config: StaticFileDBConfig = { type: 'static', path: '/invalid/path' };

		await expect(StaticFileDB.build(config, '/')).rejects.toThrow('path "/invalid/path" does not exist');
	});

	it('enterWatchMode() should set up a file watcher', () => {
		const db = new StaticFileDB('/test/path');
		const watchSpy = vi.spyOn(fs, 'watch');

		db.enterWatchMode();

		expect(watchSpy).toHaveBeenCalledWith('/test/path', { recursive: true }, expect.any(Function));
	});
});
