import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'url';
import type { NpmSourceConfig } from './source-config';

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

// Mock module (createRequire). `resolver.fn` is swappable so tests can decide which of the
// resolution strategies in resolvePackageRoot succeeds.
const { resolver } = vi.hoisted(() => ({
	resolver: {
		fn: (specifier: string): string => {
			if (specifier === '@test/pkg') return '/fake/node_modules/@test/pkg/src/index.js';
			throw new Error(`Cannot find module: ${specifier}`);
		},
	},
}));
const defaultResolve = resolver.fn;

vi.mock('module', () => ({
	createRequire: vi.fn(() => ({
		resolve: vi.fn((specifier: string) => resolver.fn(specifier)),
	})),
}));

import { NpmFileDB } from './npm';

describe('NpmFileDB', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resolver.fn = defaultResolve;
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
			source: { name: 'Test Package', url: 'https://example.com' },
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
			source: { name: 'Test Package', url: 'https://example.com' },
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

	it('strips a leading folder, and skips files outside of it', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			stripPrefix: 'dist/',
			// `include` sees the paths without the folder
			include: /^(?!readme\.txt$)/,
			dest: 'editor/',
			source: { name: 'Test Package', url: 'https://example.com' },
		};

		const db = await NpmFileDB.build(config);

		const files = Array.from(db.files.keys()).sort();
		expect(files).toStrictEqual(['editor/index.js', 'editor/index.js.map', 'editor/style.css']);
	});

	it('flattens file paths when flatten is true', async () => {
		setupMockPackage();

		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			include: /dist\/.*\.(js|css)$/,
			flatten: true,
			dest: 'lib/',
			source: { name: 'Test', url: 'https://example.com' },
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
			source: { name: 'Test', url: 'https://example.com' },
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
			source: { name: 'Test', url: 'https://example.com' },
		};

		const db = await NpmFileDB.build(config);

		// The source and the version from package.json go into the release notes.
		expect(db.source).toStrictEqual({ name: 'Test', url: 'https://example.com' });
		expect(db.version).toBe('3.4.5');
	});

	// resolvePackageRoot tries three strategies in turn, because packages differ in what they
	// expose. Only the middle one is exercised by the tests above.
	describe('resolving the package root', () => {
		const config: NpmSourceConfig = {
			type: 'npm',
			pkg: '@test/pkg',
			include: /dist\/index\.js$/,
			flatten: true,
			dest: 'lib/',
			source: { name: 'Test', url: 'https://example.com' },
		};

		it('uses the package.json export when the package offers one', async () => {
			setupMockPackage();
			// This is the path maplibre-gl takes: "./package.json" is exported, so the root is
			// known directly and no entry point has to be resolved.
			resolver.fn = (specifier) => {
				if (specifier === '@test/pkg/package.json') return '/fake/node_modules/@test/pkg/package.json';
				throw new Error(`should not resolve ${specifier}`);
			};

			const db = await NpmFileDB.build(config);

			expect(Array.from(db.files.keys())).toStrictEqual(['lib/index.js']);
			expect(db.version).toBe('3.4.5');
		});

		it('falls back to ESM resolution when require cannot resolve the package', async () => {
			// A package that is ESM-only and does not export its package.json can only be found
			// through import.meta.resolve. `tar` is a real dependency, so the resolution is real;
			// only the file system underneath it is mocked.
			const entry = fileURLToPath(import.meta.resolve('tar'));
			const pkgDir = entry.slice(0, entry.indexOf('/node_modules/tar/') + '/node_modules/tar'.length);

			mockFiles[pkgDir] = { content: '', isDir: true, mtimeMs: 0 };
			mockFiles[`${pkgDir}/package.json`] = {
				content: JSON.stringify({ name: 'tar', version: '7.0.0' }),
				isDir: false,
				mtimeMs: 0,
			};
			mockFiles[`${pkgDir}/dist`] = { content: '', isDir: true, mtimeMs: 0 };
			mockFiles[`${pkgDir}/dist/index.js`] = { content: 'esm', isDir: false, mtimeMs: 0 };

			resolver.fn = (specifier) => {
				throw new Error(`no CommonJS entry for ${specifier}`);
			};

			const db = await NpmFileDB.build({ ...config, pkg: 'tar' });

			expect(Array.from(db.files.keys())).toStrictEqual(['lib/index.js']);
			expect(db.version).toBe('7.0.0');
		});

		it('reports every failed strategy when the package cannot be resolved at all', async () => {
			resolver.fn = (specifier) => {
				throw new Error(`Cannot find module: ${specifier}`);
			};

			await expect(NpmFileDB.build({ ...config, pkg: 'package-that-does-not-exist' })).rejects.toThrow(
				'Could not resolve npm package "package-that-does-not-exist"'
			);
		});
	});
});
