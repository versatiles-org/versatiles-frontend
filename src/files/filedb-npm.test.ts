import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from '../async_progress/progress';
import type { NpmSourceConfig } from './source_config';

// Mock progress module
vi.mock('../async_progress/progress', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('../async_progress/progress');
	originalModule.default.disable();

	function mockProgressLabel(progressLabel: ProgressLabelType) {
		vi.spyOn(progressLabel, 'updateLabel');
		vi.spyOn(progressLabel, 'start');
		vi.spyOn(progressLabel, 'end');
		vi.spyOn(progressLabel, 'getOutputAnsi');
		vi.spyOn(progressLabel, 'getOutputText');
	}

	class ProgressLabel extends originalModule.ProgressLabel {
		constructor(progress: ProgressType, label: string, indent: number) {
			super(progress, label, indent);
			mockProgressLabel(this);
		}
	}

	class Progress extends originalModule.Progress {
		constructor() {
			super();
			const originalAdd = this.add.bind(this);
			this.add = ((name: string, indent = 0): ProgressLabelType => {
				const progressLabel = originalAdd(name, indent);
				mockProgressLabel(progressLabel);
				return progressLabel;
			}) as ProgressType['add'];
		}
	}

	const progress = new Progress();
	vi.spyOn(progress, 'add');
	vi.spyOn(progress, 'disable');
	vi.spyOn(progress, 'finish');
	vi.spyOn(progress, 'redraw');
	vi.spyOn(progress, 'setAnsi');
	vi.spyOn(progress, 'setHeader');
	vi.spyOn(progress, 'write');

	return {
		Progress: vi.fn(function () {
			return progress;
		}),
		default: progress,
		ProgressLabel,
	};
});

// Mock release_notes module
const { releaseNotesMock, setVersionMock } = vi.hoisted(() => {
	const setVersionMock = vi.fn();
	const releaseNotesMock = {
		add: vi.fn(() => ({ setVersion: setVersionMock })),
	};
	return { releaseNotesMock, setVersionMock };
});
vi.mock('../utils/release_notes', () => ({ default: releaseNotesMock }));

// Mock fs module
const { mockFiles } = vi.hoisted(() => {
	const mockFiles: Record<string, { content: string | Buffer; isDir: boolean; mtimeMs: number }> = {};
	return { mockFiles };
});

vi.mock('fs', async (importOriginal) => {
	const original = await importOriginal<typeof import('fs')>();
	return {
		...original,
		existsSync: vi.fn((path: string) => {
			return path in mockFiles;
		}),
		readFileSync: vi.fn((path: string, encoding?: string) => {
			const file = mockFiles[path];
			if (!file) throw new Error(`ENOENT: no such file: ${path}`);
			if (encoding === 'utf-8') return typeof file.content === 'string' ? file.content : file.content.toString();
			return Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
		}),
		statSync: vi.fn((path: string) => {
			const file = mockFiles[path];
			if (!file) throw new Error(`ENOENT: no such file: ${path}`);
			return {
				isDirectory: () => file.isDir,
				mtimeMs: file.mtimeMs,
			};
		}),
		readdirSync: vi.fn((path: string) => {
			const prefix = path.endsWith('/') ? path : path + '/';
			const entries = new Set<string>();
			for (const key of Object.keys(mockFiles)) {
				if (key.startsWith(prefix)) {
					const rest = key.slice(prefix.length);
					const name = rest.split('/')[0];
					entries.add(name);
				}
			}
			return Array.from(entries);
		}),
	};
});

// Mock module (createRequire)
vi.mock('module', () => ({
	createRequire: vi.fn(() => ({
		resolve: vi.fn((specifier: string) => {
			if (specifier === '@test/pkg') return '/fake/node_modules/@test/pkg/src/index.js';
			throw new Error(`Cannot find module: ${specifier}`);
		}),
	})),
}));

import { NpmFileDB } from './filedb-npm';

describe('NpmFileDB', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		for (const key of Object.keys(mockFiles)) delete mockFiles[key];
	});

	function setupMockPackage() {
		const pkgDir = '/fake/node_modules/@test/pkg';

		mockFiles[pkgDir] = { content: '', isDir: true, mtimeMs: 0 };
		mockFiles[`${pkgDir}/package.json`] = {
			content: JSON.stringify({ name: '@test/pkg', version: '3.4.5' }),
			isDir: false,
			mtimeMs: 1000,
		};
		mockFiles[`${pkgDir}/dist`] = { content: '', isDir: true, mtimeMs: 0 };
		mockFiles[`${pkgDir}/dist/index.js`] = { content: 'console.log("hello")', isDir: false, mtimeMs: 2000 };
		mockFiles[`${pkgDir}/dist/style.css`] = { content: 'body {}', isDir: false, mtimeMs: 3000 };
		mockFiles[`${pkgDir}/dist/index.js.map`] = { content: '{}', isDir: false, mtimeMs: 4000 };
		mockFiles[`${pkgDir}/dist/readme.txt`] = { content: 'readme', isDir: false, mtimeMs: 5000 };
		mockFiles[`${pkgDir}/src`] = { content: '', isDir: true, mtimeMs: 0 };
		mockFiles[`${pkgDir}/src/main.ts`] = { content: 'export {}', isDir: false, mtimeMs: 6000 };
	}

	it('reads files from the package directory with include filter', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			include: /dist\/.*\.(js|css|map)$/,
			flatten: true,
			dest: 'assets/lib/test/',
			notes: '[Test Package](https://example.com)',
		};

		const db = await NpmFileDB.build(config);

		const files = Array.from(db.files.keys()).sort();
		expect(files).toStrictEqual([
			'assets/lib/test/index.js',
			'assets/lib/test/index.js.map',
			'assets/lib/test/style.css',
		]);
	});

	it('includes all files when no include filter is provided', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			dest: 'output/',
			notes: '[Test Package](https://example.com)',
		};

		const db = await NpmFileDB.build(config);

		const files = Array.from(db.files.keys()).sort();
		expect(files).toStrictEqual([
			'output/dist/index.js',
			'output/dist/index.js.map',
			'output/dist/readme.txt',
			'output/dist/style.css',
			'output/package.json',
			'output/src/main.ts',
		]);
	});

	it('flattens file paths when flatten is true', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			include: /dist\/.*\.(js|css)$/,
			flatten: true,
			dest: 'lib/',
			notes: '[Test](https://example.com)',
		};

		const db = await NpmFileDB.build(config);

		const files = Array.from(db.files.keys()).sort();
		expect(files).toStrictEqual(['lib/index.js', 'lib/style.css']);
	});

	it('preserves directory structure when flatten is false', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			include: /dist\/.*\.(js|css)$/,
			flatten: false,
			dest: 'lib/',
			notes: '[Test](https://example.com)',
		};

		const db = await NpmFileDB.build(config);

		const files = Array.from(db.files.keys()).sort();
		expect(files).toStrictEqual(['lib/dist/index.js', 'lib/dist/style.css']);
	});

	it('reads version from package.json', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			include: /dist\/.*\.js$/,
			flatten: true,
			dest: 'lib/',
			notes: '[Test](https://example.com)',
		};

		await NpmFileDB.build(config);

		// The release notes mock should have been called with the version from package.json
		expect(releaseNotesMock.add).toHaveBeenCalledWith('[Test](https://example.com)');
		expect(setVersionMock).toHaveBeenCalledWith('3.4.5');
	});
});
