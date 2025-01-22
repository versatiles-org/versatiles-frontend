import { jest } from '@jest/globals';
import type { StaticFileDBConfig } from './filedb-static';

jest.unstable_mockModule('node:fs', () => {
	const mockFileSystem = new Map<string, string | false>([
		['/test/path', false],
		['/test/path/file1.txt', 'Content of file1'],
		['/test/path/file2.txt', 'Content of file2'],
		['/test/path/subdir', false],
		['/test/path/subdir/file3.txt', 'Content of file3'],
	]);

	return {
		existsSync: jest.fn(path => mockFileSystem.has(String(path))),
		mkdirSync: jest.fn(),
		rmSync: jest.fn(),
		readdirSync: jest.fn((path: string) => {
			return Array.from(mockFileSystem.keys())
				.filter(key => key.startsWith(String(path) + '/'))
				.map(key => key.slice(String(path).length + 1).split('/')[0]);
		}),
		readFileSync: jest.fn(path => Buffer.from(mockFileSystem.get(String(path)) || '')),
		statSync: jest.fn((path: string) => ({
			isDirectory: () => mockFileSystem.get(String(path)) === false,
			isFile: () => mockFileSystem.has(String(path)),
			mtimeMs: 1234567890,
			atime: new Date(),
			mtime: new Date(),
			ctime: new Date(),
			birthtime: new Date(),
		})),
		watch: jest.fn(() => ({
			close: jest.fn(),
			ref: jest.fn(),
			unref: jest.fn(),
			addListener: jest.fn(),
			on: jest.fn(),
			removeListener: jest.fn(),
		})),
		writeFileSync: jest.fn(),
	};
});

const fs = await import('node:fs');
const { StaticFileDB } = await import('./filedb-static');

describe('StaticFileDB', () => {
	afterAll(() => {
		jest.restoreAllMocks();
	});

	test('build() should correctly populate the database', async () => {
		const config: StaticFileDBConfig = { type: 'static', path: '/test/path' };
		const db = await StaticFileDB.build(config, '/');

		expect(db.getFile('file1.txt')).toEqual(Buffer.from('Content of file1'));
		expect(db.getFile('file2.txt')).toEqual(Buffer.from('Content of file2'));
		expect(db.getFile('subdir/file3.txt')).toEqual(Buffer.from('Content of file3'));
	});

	test('build() should throw an error if path does not exist', async () => {
		const config: StaticFileDBConfig = { type: 'static', path: '/invalid/path' };

		await expect(StaticFileDB.build(config, '/')).rejects.toThrow('path "/invalid/path" does not exist');
	});

	test('enterWatchMode() should set up a file watcher', () => {
		const db = new StaticFileDB('/test/path');
		const watchSpy = jest.spyOn(fs, 'watch');

		db.enterWatchMode();

		expect(watchSpy).toHaveBeenCalledWith('/test/path', { recursive: true }, expect.any(Function));
	});
});
