import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createContext, runInContext } from 'vm';
import type { NpmSourceConfig } from './source_config';

/**
 * Tests for the esbuild bundling step in `NpmFileDB.build`.
 *
 * It lives in its own file because it needs a real package on a real filesystem: esbuild is a
 * separate binary that reads the entry point itself, so the mocked `fs` used by
 * filedb-npm.test.ts cannot serve it. Only the module resolver is mocked, to point a package
 * name at the fixture below.
 *
 * What is worth asserting here is the contract the shim exists for, not the shape of the call to
 * esbuild: the output has to be a classic script that a plain `<script src>` can load, and the
 * global it publishes has to be a writable object that UMD plugins can attach themselves to.
 * Both are verified by running the generated bundle.
 */

let pkgDir: string;

const { resolver } = vi.hoisted(() => ({ resolver: { dir: '' } }));

vi.mock('module', () => ({
	createRequire: vi.fn(() => ({
		resolve: vi.fn((specifier: string) => {
			if (specifier === '@test/bundle-pkg/package.json') return join(resolver.dir, 'package.json');
			throw new Error(`Cannot find module: ${specifier}`);
		}),
	})),
}));

vi.mock('../utils/release_notes', () => ({
	default: { add: vi.fn(() => ({ setVersion: vi.fn() })) },
}));

const { NpmFileDB } = await import('./filedb-npm');

beforeAll(() => {
	pkgDir = mkdtempSync(join(tmpdir(), 'versatiles-bundle-test-'));
	resolver.dir = pkgDir;

	writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@test/bundle-pkg', version: '1.2.3' }));
	mkdirSync(join(pkgDir, 'dist'));
	// An ESM-only entry point with no UMD build - the situation the shim exists for.
	writeFileSync(
		join(pkgDir, 'dist', 'lib.mjs'),
		[
			"export const greeting = 'hello';",
			'export class Widget {',
			'  constructor(name) { this.name = name; }',
			'}',
			'export function setup(value) { return value * 2; }',
		].join('\n')
	);
});

afterAll(() => {
	rmSync(pkgDir, { recursive: true, force: true });
});

function config(bundle: Partial<NpmSourceConfig['bundle']> = {}): NpmSourceConfig {
	return {
		type: 'npm',
		pkg: '@test/bundle-pkg',
		bundle: {
			entry: 'dist/lib.mjs',
			globalName: 'testlib',
			outfile: 'testlib.js',
			...bundle,
		} as NpmSourceConfig['bundle'],
		// Nothing from the package itself, so the database holds only what the bundler produced.
		include: /^$/,
		dest: 'assets/lib/testlib/',
		source: { name: 'Test Lib', url: 'https://example.com' },
	};
}

/**
 * Runs a generated bundle the way a browser would run a `<script src>` tag, and returns the
 * globals it left behind.
 */
function evaluateBundle(code: string): Record<string, unknown> {
	const sandbox: Record<string, unknown> = {};
	runInContext(code, createContext(sandbox));
	return sandbox;
}

describe('NpmFileDB bundling', () => {
	it('emits the bundle and its source map under dest', async () => {
		const db = await NpmFileDB.build(config());

		expect([...db.files.keys()].sort()).toStrictEqual([
			'assets/lib/testlib/testlib.js',
			'assets/lib/testlib/testlib.js.map',
		]);
	});

	it('produces a classic script that publishes the global', async () => {
		const db = await NpmFileDB.build(config());
		const code = db.getFile('assets/lib/testlib/testlib.js')!.toString('utf8');

		// No import/export syntax survives: a classic script tag has to be able to run this.
		const globals = evaluateBundle(code);
		const lib = globals.testlib as Record<string, unknown>;

		expect(lib).toBeTypeOf('object');
		expect(lib.greeting).toBe('hello');
		expect(typeof lib.Widget).toBe('function');
		expect((lib.setup as (v: number) => number)(21)).toBe(42);
	});

	it('publishes a writable object so UMD plugins can attach to it', async () => {
		// The reason for the shim: esbuild's own `globalName` would expose the ES module
		// namespace, whose properties are getter-only and non-configurable. Plugins such as
		// maplibre-gl-compare attach themselves with `maplibregl.Compare = ...`, which would
		// throw against a namespace object.
		const db = await NpmFileDB.build(config());
		const globals = evaluateBundle(db.getFile('assets/lib/testlib/testlib.js')!.toString('utf8'));
		const lib = globals.testlib as Record<string, unknown>;

		expect(() => {
			lib.Compare = 'attached';
		}).not.toThrow();
		expect(lib.Compare).toBe('attached');

		const descriptor = Object.getOwnPropertyDescriptor(lib, 'greeting');
		expect(descriptor?.writable).toBe(true);
		expect(descriptor?.configurable).toBe(true);
	});

	it('runs setup with the global in scope, before it is published', async () => {
		const db = await NpmFileDB.build(
			config({ setup: 'testlib.configured = true; globalThis.publishedDuringSetup = "testlib" in globalThis;' })
		);
		const globals = evaluateBundle(db.getFile('assets/lib/testlib/testlib.js')!.toString('utf8'));

		expect((globals.testlib as Record<string, unknown>).configured).toBe(true);
		// Setup runs while the object is still private, so consumers never observe a half-built
		// global: the assignment to globalThis is the last thing the bundle does.
		expect(globals.publishedDuringSetup).toBe(false);
	});

	it('inlines the dependency rather than leaving an import behind', async () => {
		const db = await NpmFileDB.build(config());
		const code = db.getFile('assets/lib/testlib/testlib.js')!.toString('utf8');

		expect(code).not.toMatch(/\bimport\s*[({'"]/);
		expect(code).not.toMatch(/\bexport\s*[{*]/);
	});

	it('leaves behind exactly the one global it advertises', async () => {
		// Anything else at global scope is a name the page did not ask for and could collide with.
		const db = await NpmFileDB.build(config());
		const globals = evaluateBundle(db.getFile('assets/lib/testlib/testlib.js')!.toString('utf8'));

		expect(Object.keys(globals)).toStrictEqual(['testlib']);
	});

	it('points the source map at the original entry point', async () => {
		const db = await NpmFileDB.build(config());
		const map = JSON.parse(db.getFile('assets/lib/testlib/testlib.js.map')!.toString('utf8')) as {
			sources: string[];
		};

		expect(map.sources.some((source) => source.endsWith('lib.mjs'))).toBe(true);
	});

	it('keeps package files alongside the bundle when include matches them', async () => {
		const db = await NpmFileDB.build({ ...config(), include: /dist\/lib\.mjs$/, flatten: true });

		expect([...db.files.keys()].sort()).toStrictEqual([
			'assets/lib/testlib/lib.mjs',
			'assets/lib/testlib/testlib.js',
			'assets/lib/testlib/testlib.js.map',
		]);
	});
});
