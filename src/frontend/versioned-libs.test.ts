import { describe, it, expect } from 'vitest';
import { FileDB, type FileDBs } from '../sources';
import { Frontend } from './frontend';
import { VersionedLibs } from './versioned-libs';

class TestDB extends FileDB {
	public constructor(files: Record<string, string>, version = '') {
		super();
		this.version = version;
		for (const [name, content] of Object.entries(files)) this.setFileFromBuffer(name, Buffer.from(content));
	}

	public enterWatchMode(): void {}
}

/** An npm library, a library of this repository, and a page that loads both. */
function testDBs(): Record<string, TestDB> {
	return {
		maplibre: new TestDB(
			{
				'assets/lib/maplibre-gl/maplibre-gl.js': 'maplibre',
				'assets/lib/maplibre-gl/maplibre-gl-worker.mjs': 'worker',
			},
			'6.0.0'
		),
		all: new TestDB({
			'assets/lib/versatiles-brand/versatiles-brand.js': 'brand',
			'index.html':
				'<script src="/assets/lib/maplibre-gl/maplibre-gl.js"></script>' +
				'<script src="/assets/lib/versatiles-brand/versatiles-brand.js"></script>' +
				'<script src="/assets/lib/unknown/unknown.js"></script>',
			'assets/styles/style.json': '{}',
		}),
	};
}

function frontendOf(dbs: Record<string, TestDB>, version: string): Frontend {
	const fileDBs = { get: (id: string) => dbs[id] } as unknown as FileDBs;
	return new Frontend(fileDBs, { name: 'test', description: '', fileDBs: Object.keys(dbs) }, [], version);
}

describe('VersionedLibs', () => {
	it('names a library after its own version, or after the frontend version if it has none', () => {
		const libs = VersionedLibs.fromFileDBs(Object.values(testDBs()), '3.20.0');
		expect(libs.versionedPath('assets/lib/maplibre-gl/maplibre-gl.js')).toBe(
			'assets/lib/maplibre-gl@6.0.0/maplibre-gl.js'
		);
		expect(libs.versionedPath('assets/lib/versatiles-brand/versatiles-brand.js')).toBe(
			'assets/lib/versatiles-brand@3.20.0/versatiles-brand.js'
		);
	});

	it('leaves the libraries of this repository unversioned without a frontend version', () => {
		const libs = VersionedLibs.fromFileDBs(Object.values(testDBs()), '');
		expect(libs.versionedPath('assets/lib/versatiles-brand/versatiles-brand.js')).toBeNull();
		expect(libs.versionedPath('assets/lib/maplibre-gl/maplibre-gl.js')).not.toBeNull();
	});

	it('gives a library the version of the first database that has it', () => {
		const first = new TestDB({ 'assets/lib/x/x.js': '1' }, '1.0.0');
		const second = new TestDB({ 'assets/lib/x/x.js': '2' }, '2.0.0');
		const libs = VersionedLibs.fromFileDBs([first, second], '3.20.0');
		expect(libs.versionedPath('assets/lib/x/x.js')).toBe('assets/lib/x@1.0.0/x.js');
	});

	it('maps only files of libraries, and back', () => {
		const libs = VersionedLibs.fromFileDBs(Object.values(testDBs()), '3.20.0');
		expect(libs.versionedPath('assets/styles/style.json')).toBeNull();
		expect(libs.versionedPath('assets/lib/unknown/unknown.js')).toBeNull();
		expect(libs.versionedPath('assets/lib/maplibre-gl@6.0.0/maplibre-gl.js')).toBeNull();
		expect(libs.unversionedPath('assets/lib/maplibre-gl@6.0.0/maplibre-gl.js')).toBe(
			'assets/lib/maplibre-gl/maplibre-gl.js'
		);
		expect(libs.unversionedPath('assets/lib/maplibre-gl@5.0.0/maplibre-gl.js')).toBeNull();
		expect(libs.unversionedPath('assets/lib/maplibre-gl/maplibre-gl.js')).toBeNull();
	});

	it('points the HTML at the versioned folders of known libraries only', () => {
		const libs = new VersionedLibs(new Map([['maplibre-gl', 'maplibre-gl@6.0.0']]));
		const html =
			'<script src="/assets/lib/maplibre-gl/maplibre-gl.js"></script>' +
			'<link href="/assets/lib/maplibre-gl/maplibre-gl.css" />' +
			'<script src="/assets/lib/maplibre-gl-inspect/maplibre-gl-inspect.js"></script>';
		expect(libs.rewriteHtml(Buffer.from(html)).toString()).toBe(
			'<script src="/assets/lib/maplibre-gl@6.0.0/maplibre-gl.js"></script>' +
				'<link href="/assets/lib/maplibre-gl@6.0.0/maplibre-gl.css" />' +
				'<script src="/assets/lib/maplibre-gl-inspect/maplibre-gl-inspect.js"></script>'
		);
	});

	it('returns the same buffer when the HTML loads no library', () => {
		const libs = new VersionedLibs(new Map([['maplibre-gl', 'maplibre-gl@6.0.0']]));
		const html = Buffer.from('<p>no scripts</p>');
		expect(libs.rewriteHtml(html)).toBe(html);
	});

	it('refuses a version with a slash, which would add a folder', () => {
		const db = new TestDB({ 'assets/lib/x/x.js': '1' }, '1.0/2');
		expect(() => VersionedLibs.fromFileDBs([db], '')).toThrow(/contains a "\/"/);
	});
});

describe('Frontend with versioned libraries', () => {
	it('emits each library file under both paths, and HTML that loads the versioned ones', () => {
		const files = new Map([...frontendOf(testDBs(), '3.20.0').iterate()].map((f) => [f.name, f.bufferRaw.toString()]));
		expect([...files.keys()].sort()).toStrictEqual([
			'assets/lib/maplibre-gl/maplibre-gl-worker.mjs',
			'assets/lib/maplibre-gl/maplibre-gl.js',
			'assets/lib/maplibre-gl@6.0.0/maplibre-gl-worker.mjs',
			'assets/lib/maplibre-gl@6.0.0/maplibre-gl.js',
			'assets/lib/versatiles-brand/versatiles-brand.js',
			'assets/lib/versatiles-brand@3.20.0/versatiles-brand.js',
			'assets/styles/style.json',
			'index.html',
		]);
		expect(files.get('assets/lib/maplibre-gl@6.0.0/maplibre-gl.js')).toBe('maplibre');
		expect(files.get('index.html')).toBe(
			'<script src="/assets/lib/maplibre-gl@6.0.0/maplibre-gl.js"></script>' +
				'<script src="/assets/lib/versatiles-brand@3.20.0/versatiles-brand.js"></script>' +
				'<script src="/assets/lib/unknown/unknown.js"></script>'
		);
	});

	it('serves the same through getFile, as the dev server does', () => {
		const frontend = frontendOf(testDBs(), '3.20.0');
		expect(frontend.getFile('assets/lib/maplibre-gl@6.0.0/maplibre-gl.js')?.toString()).toBe('maplibre');
		expect(frontend.getFile('assets/lib/maplibre-gl/maplibre-gl.js')?.toString()).toBe('maplibre');
		expect(frontend.getFile('assets/lib/maplibre-gl@5.0.0/maplibre-gl.js')).toBeNull();
		expect(frontend.getFile('index.html')?.toString()).toContain('/assets/lib/versatiles-brand@3.20.0/');
	});
});
