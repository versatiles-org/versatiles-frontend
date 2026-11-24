import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { Bundles, listTarFiles, readTarFile } from './bundles';
import { frontendConfigs, sourceConfigs } from '../src/config';

function expectMinSizes(actual: Record<string, number> | number, expected: Record<string, number>) {
	for (const [bundle, min] of Object.entries(expected)) {
		const value = typeof actual === 'number' ? actual : actual[bundle];
		expect.soft(value, `size in ${bundle}`).toBeGreaterThan(min);
	}
}

const BUNDLE_NAMES = frontendConfigs.map((c) => c.name);

const packageVersion = (
	JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version;

/** Whether a path is in a versioned library folder, such as `assets/lib/maplibre-gl@6.0.0/`. */
function isVersioned(path: string): boolean {
	return /^assets\/lib\/[^/@]+@[^/]+\//.test(path);
}

/**
 * Whether a path matches a pattern of versatiles' `immutable` setting: `*` matches within one
 * segment, `**` as a whole segment any number of segments, none included.
 */
function matchesPattern(pattern: string, path: string): boolean {
	const match = (p: string[], s: string[]): boolean => {
		if (p.length === 0) return s.length === 0;
		if (p[0] === '**') return s.some((_, i) => match(p.slice(1), s.slice(i))) || match(p.slice(1), []);
		if (s.length === 0) return false;
		const segment = new RegExp(
			'^' +
				p[0]
					.split('*')
					.map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
					.join('[^/]*') +
				'$'
		);
		return segment.test(s[0]) && match(p.slice(1), s.slice(1));
	};
	return match(pattern.split('/'), path.split('/'));
}

const bundles = new Bundles(
	await Promise.all(
		BUNDLE_NAMES.map(async (name) => ({
			name,
			files: await listTarFiles(name + '.tar.gz'),
		}))
	)
);

/**
 * Every assertion about bundle contents below is a soft one.
 *
 * Checking a file also *claims* it: `file()`, `count()` and `rest()` mark what they matched, and
 * the `afterAll` hooks then assert that nothing was left unclaimed. A hard assertion aborts its
 * test on the first mismatch, so the claims after it never happen and the completeness check
 * reports a cascade of files that are perfectly fine - which is why it used to be skipped
 * entirely once anything failed, losing the strongest check in this file exactly when it was
 * most useful. Soft assertions record the failure and carry on, so the claims still complete and
 * the completeness check can always run.
 */
describe('Bundle contents', () => {
	it('contains glyphs', () => {
		const path = bundles.withPrefix('assets/glyphs/');
		expect.soft(path.file('font_families.json')).toBeTruthy();
		expect.soft(path.file('index.json')).toBeTruthy();

		// 4 faces (regular, bold and their italics since versatiles-fonts v3) × 256 ranges.
		// Counted as two disjoint sets, because `count` claims each file once: the upright faces
		// are everywhere, the italics everywhere except frontend-tiny, whose style never asks for
		// them. A bundle with none at all drops out of the result, so frontend-tiny's absence
		// below is the assertion that it ships no italics.
		expect.soft(path.count(/^noto_sans_(regular|bold)\/\d+-\d+\.pbf$/)).toStrictEqual(512);
		expect.soft(path.count(/^noto_sans_(regular|bold)_italic\/\d+-\d+\.pbf$/)).toStrictEqual({
			frontend: 512,
			'frontend-blank': 512,
			'frontend-dev': 512,
			'frontend-min': 512,
		});
		expectMinSizes(path.sizes(/^noto_sans_\w+\/\d+-\d+\.pbf$/), {
			frontend: 77e6,
			'frontend-blank': 77e6,
			'frontend-dev': 77e6,
			'frontend-min': 77e6,
			// Roughly 0.83 MB: the upright faces' Latin ranges, the rest being empty glyph tiles.
			'frontend-tiny': 700e3,
		});

		expect.soft(path.count(/^[a-z0-9_]+\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-blank': 47360,
			'frontend-dev': 47360,
			frontend: 47360,
		});

		expect.soft(path.rest()).toStrictEqual({}); // no other files in glyphs/
	});

	it('contains logo', () => {
		const path = bundles.withPrefix('assets/images/');
		expect.soft(path.file('versatiles-logo.png')).toBeTruthy();
		expect.soft(path.rest()).toStrictEqual({}); // no other files in images/
	});

	describe('libraries', () => {
		it('contains maplibre-gl', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl/');
			const notTiny = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
			expect.soft(path.file('maplibre-gl.css')).toBeTruthy();
			// Bundled from the ESM-only upstream package into a classic script (see src/config/index.ts).
			expect.soft(path.file('maplibre-gl.js')).toBeTruthy();
			expect.soft(path.file('maplibre-gl.js.map')).toStrictEqual(notTiny);
			// The worker is loaded as a module and imports the shared chunk itself.
			expect.soft(path.file('maplibre-gl-worker.mjs')).toBeTruthy();
			expect.soft(path.file('maplibre-gl-shared.mjs')).toBeTruthy();
			expect.soft(path.rest()).toStrictEqual({});
		});

		it('contains maplibre-gl-inspect', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl-inspect/');
			expect.soft(path.file('maplibre-gl-inspect.css')).toBeTruthy();
			expect.soft(path.file('maplibre-gl-inspect.js.map')).toBeTruthy();
			expect.soft(path.file('maplibre-gl-inspect.js')).toBeTruthy();
			expect.soft(path.file('maplibre-gl-inspect.mjs.map')).toBeTruthy();
			expect.soft(path.rest()).toStrictEqual({});
		});

		// Shipped for anyone building on the bundles; no page loads it, because the frontends
		// show a single map and Compare needs two. frontend-tiny and frontend-blank leave it out.
		it('contains maplibre-gl-compare, except in frontend-tiny', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl-compare/');
			const notTinyNorBlank = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
			expect.soft(path.file('maplibre-gl-compare.css')).toStrictEqual(notTinyNorBlank);
			expect.soft(path.file('maplibre-gl-compare.js')).toStrictEqual(notTinyNorBlank);
			expect.soft(path.rest()).toStrictEqual({});
		});

		// No frontend loads this any more - the pages use versatiles-geocoder below - but it is
		// still shipped for anyone building on the bundles. frontend-tiny leaves it out.
		it('contains maplibre-gl-geocoder, except in frontend-tiny', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl-geocoder/');
			const notTinyNorBlank = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
			expect.soft(path.file('maplibre-gl-geocoder.css')).toStrictEqual(notTinyNorBlank);
			expect.soft(path.file('maplibre-gl-geocoder.js')).toStrictEqual(notTinyNorBlank);
			expect.soft(path.file('maplibre-gl-geocoder.js.map')).toStrictEqual(notTinyNorBlank);
			expect.soft(path.rest()).toStrictEqual({});
		});

		it('contains maplibre-versatiles-styler', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-versatiles-styler/');
			expect.soft(path.file('maplibre-versatiles-styler.d.ts')).toBeTruthy();
			expect.soft(path.file('maplibre-versatiles-styler.js.map')).toBeTruthy();
			expect.soft(path.file('maplibre-versatiles-styler.js')).toBeTruthy();
			expect.soft(path.rest()).toStrictEqual({});
		});

		it('contains versatiles-svg-renderer', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-svg-renderer/');
			expect.soft(path.file('versatiles-svg-renderer.js')).toBeTruthy();
			expect.soft(path.rest()).toStrictEqual({});
		});

		it('contains versatiles-style', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-style/');
			expect.soft(path.file('versatiles-style.d.ts')).toBeTruthy();
			expect.soft(path.file('versatiles-style.js.map')).toBeTruthy();
			expect.soft(path.file('versatiles-style.js')).toBeTruthy();
			expect.soft(path.rest()).toStrictEqual({});
		});

		// Not a third-party package: our own logo and support link, served from static/all/
		// like versatiles-geocoder below.
		it('contains versatiles-brand in every frontend with a page', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-brand/');
			const withPages = { frontend: true, 'frontend-dev': true, 'frontend-min': true, 'frontend-tiny': true };
			expect.soft(path.file('versatiles-brand.js')).toStrictEqual(withPages);
			expect.soft(path.file('versatiles-brand.css')).toStrictEqual(withPages);
			expect.soft(path.rest()).toStrictEqual({});
		});

		// Not a third-party package: our own location search, served from static/all/ and
		// used by every frontend that has a page. frontend-blank ships no HTML, so it has none.
		it('contains versatiles-geocoder in every frontend with a page', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-geocoder/');
			const withPages = { frontend: true, 'frontend-dev': true, 'frontend-min': true, 'frontend-tiny': true };
			expect.soft(path.file('versatiles-geocoder.js')).toStrictEqual(withPages);
			expect.soft(path.file('versatiles-geocoder.css')).toStrictEqual(withPages);
			expect.soft(path.rest()).toStrictEqual({});
		});

		// Not a third-party package: our setup of maplibre-gl-inspect, served from static/frontend/,
		// so only in the frontends whose page has inspect.
		it('contains versatiles-inspect in frontend and frontend-min', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-inspect/');
			const withInspect = { frontend: true, 'frontend-min': true };
			expect.soft(path.file('versatiles-inspect.js')).toStrictEqual(withInspect);
			expect.soft(path.file('versatiles-inspect.css')).toStrictEqual(withInspect);
			expect.soft(path.rest()).toStrictEqual({});
		});

		it('contains every library also in its versioned folder, as the same file', () => {
			// The libraries of this repository carry the frontend's version, the others their own.
			const OWN_LIBRARIES = ['versatiles-brand', 'versatiles-geocoder', 'versatiles-inspect'];
			for (const bundle of bundles.bundles) {
				const libFiles = bundle.files.filter((f) => f.name.startsWith('assets/lib/'));
				const unversioned = new Map(libFiles.filter((f) => !isVersioned(f.name)).map((f) => [f.name, f]));
				const versioned = libFiles.filter((f) => isVersioned(f.name));
				const counterparts = new Set<string>();
				for (const file of versioned) {
					const [, name, version, rest] = file.name.match(/^assets\/lib\/([^/@]+)@([^/]+)\/(.+)$/) ?? [];
					const original = unversioned.get(`assets/lib/${name}/${rest}`);
					expect.soft(original, `${bundle.name}: ${file.name} has no unversioned file`).toBeDefined();
					if (!original) continue;
					counterparts.add(original.name);
					// The same content: the tarball links one to the other, unless both are empty (an empty
					// file takes no space, so it is never linked).
					const linked =
						(file.size === 0 && original.size === 0) ||
						file.linkTo === original.name ||
						original.linkTo === file.name ||
						(file.linkTo != null && file.linkTo === original.linkTo);
					expect.soft(linked, `${bundle.name}: ${file.name} is not a link to ${original.name}`).toBe(true);
					if (OWN_LIBRARIES.includes(name)) {
						expect.soft(version, `${bundle.name}: version of ${name}`).toBe(packageVersion);
					} else {
						expect.soft(version, `${bundle.name}: version of ${name}`).toMatch(/^\d+\.\d+\.\d+/);
					}
				}
				const missing = [...unversioned.keys()].filter((name) => !counterparts.has(name));
				expect.soft(missing, `${bundle.name}: library files without a versioned copy`).toStrictEqual([]);
			}
			// Claims the versioned copies, checked above.
			bundles.withPrefix('assets/lib/').count(/^[^/]+@[^/]+\//);
		});

		afterAll(() => {
			expect(bundles.withPrefix('assets/lib/').rest()).toStrictEqual({}); // no other files in lib/
		});
	});

	it('contains sprites', () => {
		const path = bundles.withPrefix('assets/sprites/');
		expect.soft(path.file('index.json')).toBeTruthy();

		// Since versatiles-style v6 the sprites are three flat sheets - base, extras and icons -
		// listed in index.json and shipped at 1x and 2x. The @3x/@4x sheets of earlier releases
		// are gone, so frontend-tiny's *@3x/*@4x ignore rules no longer drop anything here and
		// every bundle carries the same set.
		for (const sheet of ['base', 'extras', 'icons']) {
			expect.soft(path.count(new RegExp(`^${sheet}\\.(json|png)$`)), sheet).toBe(2);
			expect.soft(path.count(new RegExp(`^${sheet}@2x\\.(json|png)$`)), `${sheet}@2x`).toBe(2);
		}

		// sizes() collapses to a single number only while every bundle holds the same sheets.
		expect.soft(path.sizes(/^base(@2x)?\.(json|png)$/)).toBeGreaterThan(300e3);
		expect.soft(path.sizes(/^extras(@2x)?\.(json|png)$/)).toBeGreaterThan(170e3);
		expect.soft(path.sizes(/^icons(@2x)?\.(json|png)$/)).toBeGreaterThan(300e3);

		expect.soft(path.rest()).toStrictEqual({});
	});

	it('contains no styles', () => {
		const path = bundles.withPrefix('assets/styles/');
		expect.soft(path.rest()).toStrictEqual({});
	});

	it('contains the map editor', () => {
		const path = bundles.withPrefix('editor/');
		const withEditor = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
		expect.soft(path.file('index.html')).toStrictEqual(withEditor);
		expect.soft(path.file('view/index.html')).toStrictEqual(withEditor);
		expect.soft(path.file('map-editor.config.jsonc')).toStrictEqual(withEditor);
		expect.soft(path.file('favicon.ico')).toStrictEqual(withEditor);
		expect.soft(path.file('favicon.svg')).toStrictEqual(withEditor);
		expect.soft(path.file('apple-touch-icon.png')).toStrictEqual(withEditor);
		expect.soft(path.file('THIRD_PARTY_LICENSES.txt')).toStrictEqual(withEditor);
		// The files of the app have hashed names, so only their number and size are checked.
		expectMinSizes(path.sizes(/^_app\//), { frontend: 1.5e6, 'frontend-dev': 1.5e6, 'frontend-min': 1.5e6 });
		expectMinSizes(path.count(/^_app\//), { frontend: 10, 'frontend-dev': 10, 'frontend-min': 10 });
		expect.soft(path.rest()).toStrictEqual({});
	});

	describe('basic html files', () => {
		it('contains preview.html', () => {
			expect.soft(bundles.withPrefix('').count(/^preview\.html$/)).toStrictEqual({
				'frontend-dev': 1,
			});
		});

		it('contains index.html', () => {
			expect.soft(bundles.withPrefix('').file('index.html')).toBeTruthy();
		});

		it('contains robots.txt', () => {
			expect.soft(bundles.withPrefix('').file('robots.txt')).toBeTruthy();
		});
	});

	it('contains version.json', () => {
		expect.soft(bundles.withPrefix('').file('version.json')).toBeTruthy();
	});

	afterAll(() => {
		bundles.expectEmpty();
	});
});

describe('caching of the versioned library folders', () => {
	// The pattern the README tells servers to set, e.g. `immutable: ['assets/lib/*@*/**']`.
	const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
	const pattern = readme.match(/^\s+immutable: \['([^']+)'\]$/m)?.[1];

	it('is documented in the README', () => {
		expect(pattern).toBe('assets/lib/*@*/**');
	});

	for (const bundle of bundles.bundles) {
		it(`matches exactly the versioned library files of ${bundle.name}`, () => {
			const matched = bundle.files.filter((f) => matchesPattern(pattern ?? '', f.name)).map((f) => f.name);
			const versioned = bundle.files.filter((f) => isVersioned(f.name)).map((f) => f.name);
			expect(matched).toStrictEqual(versioned);
		});
	}

	for (const config of frontendConfigs) {
		for (const page of ['index.html', 'preview.html']) {
			it(`loads only versioned libraries that exist from ${page} of ${config.name}`, async () => {
				const bundle = bundles.bundles.find((b) => b.name === config.name);
				if (!bundle?.files.some((f) => f.name === page)) return;
				const html = String(await readTarFile(config.name + '.tar.gz', page));
				const names = new Set(bundle.files.map((f) => f.name));
				const references = [...html.matchAll(/\/(assets\/lib\/[^"'\s)]+)/g)].map((m) => m[1]);
				for (const path of references) {
					expect.soft(isVersioned(path), `${config.name}/${page} loads unversioned ${path}`).toBe(true);
					expect.soft(names.has(path), `${config.name}/${page} loads missing ${path}`).toBe(true);
				}
			});
		}
	}
});

describe('version.json', () => {
	const version = packageVersion;

	for (const config of frontendConfigs) {
		it(`names the version, the commit and the components of ${config.name}`, async () => {
			const content = await readTarFile(config.name + '.tar.gz', 'version.json');
			const info = JSON.parse(String(content)) as Record<string, unknown>;

			// The sources of the bundle, each once, in the order of its configuration.
			const sources = config.fileDBs.flatMap((id) => {
				const source = sourceConfigs[id];
				return 'source' in source && source.source ? [source.source.name] : [];
			});
			expect(info).toMatchObject({ name: 'VersaTiles Frontend', frontend: config.name, version });
			expect(info.commit).toMatch(/^[0-9a-f]{40}$/);
			expect(Date.parse(String(info.built))).not.toBeNaN();
			expect(Object.keys(info.components as object)).toStrictEqual([...new Set(sources)]);
		});
	}
});

describe('brotli bundles match regular bundles', () => {
	// The regular bundles were already read at the top of this file. Reading them again here
	// doubles the work of the slowest tests in the suite for no extra coverage.
	const regularFiles = new Map(bundles.bundles.map((b) => [b.name, b.files.map((f) => f.name).sort()]));

	for (const name of BUNDLE_NAMES) {
		it(`${name}.br.tar.gz matches ${name}.tar.gz`, async () => {
			const brotli = (await listTarFiles(`${name}.br.tar.gz`)).map((f) => f.name.slice(0, -3)).sort();
			expect(brotli).toStrictEqual(regularFiles.get(name));
		});
	}
});

describe('zstd bundles match regular bundles', () => {
	const regularFiles = new Map(bundles.bundles.map((b) => [b.name, b.files.map((f) => f.name).sort()]));

	for (const name of BUNDLE_NAMES) {
		it(`${name}.tar.zst matches ${name}.tar.gz`, async () => {
			const files = await listTarFiles(`${name}.tar.zst`);
			expect(files.map((f) => f.name).sort()).toStrictEqual(regularFiles.get(name));

			// Every hardlink points to a regular file of the same archive.
			const regular = new Set(files.filter((f) => f.linkTo == null).map((f) => f.name));
			for (const file of files) {
				if (file.linkTo != null) expect(regular.has(file.linkTo), `${file.name} -> ${file.linkTo}`).toBe(true);
			}
		});
	}
});

describe('bundles use hardlinks for duplicated glyph ranges and versioned libraries', () => {
	for (const ext of ['.tar.gz', '.br.tar.gz', '.tar.zst']) {
		it(`frontend-min${ext}`, async () => {
			// The italic Noto Sans faces share many ranges with the upright faces, and every library
			// file is also in its versioned folder.
			const files = await listTarFiles(`frontend-min${ext}`);
			const links = files.filter((f) => f.linkTo != null);
			expect(links.some((f) => f.name.startsWith('assets/glyphs/'))).toBe(true);
			expect(links.some((f) => isVersioned(f.name))).toBe(true);
			const others = links.filter((f) => !f.name.startsWith('assets/glyphs/') && !isVersioned(f.name));
			expect(others.map((f) => f.name)).toStrictEqual([]);
		});
	}
});
