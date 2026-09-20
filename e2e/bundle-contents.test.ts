import { describe, it, expect, afterAll, beforeEach, onTestFailed } from 'vitest';
import { Bundles, listTarFiles } from './utils';
import { frontendConfigs } from '../frontends/config';

function expectMinSizes(actual: Record<string, number> | number, expected: Record<string, number>) {
	for (const [bundle, min] of Object.entries(expected)) {
		const value = typeof actual === 'number' ? actual : actual[bundle];
		expect(value, `size in ${bundle}`).toBeGreaterThan(min);
	}
}

const BUNDLE_NAMES = frontendConfigs.map((c) => c.name);

const bundles = new Bundles(
	await Promise.all(
		BUNDLE_NAMES.map(async (name) => ({
			name,
			files: await listTarFiles(name + '.tar.gz'),
		}))
	)
);

describe('Bundle contents', () => {
	let hasAnyFailed = false;
	beforeEach(() => {
		onTestFailed(() => {
			hasAnyFailed = true;
		});
	});

	it('contains glyphs', () => {
		const path = bundles.withPrefix('assets/glyphs/');
		expect(path.file('font_families.json')).toBeTruthy();
		expect(path.file('index.json')).toBeTruthy();

		// 4 faces (regular, bold and their italics since versatiles-fonts v3) × 256 ranges
		expect(path.count(/^noto_sans_\w+\/\d+-\d+\.pbf$/)).toStrictEqual(1024);
		expectMinSizes(path.sizes(/^noto_sans_\w+\/\d+-\d+\.pbf$/), {
			frontend: 77e6,
			'frontend-blank': 77e6,
			'frontend-dev': 77e6,
			'frontend-min': 77e6,
			'frontend-tiny': 800e3,
		});

		expect(path.count(/^[a-z0-9_]+\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-blank': 47360,
			'frontend-dev': 47360,
			frontend: 47360,
		});

		expect(path.rest()).toStrictEqual({}); // no other files in glyphs/
	});

	it('contains logo', () => {
		const path = bundles.withPrefix('assets/images/');
		expect(path.file('versatiles-logo.png')).toBeTruthy();
		expect(path.rest()).toStrictEqual({}); // no other files in images/
	});

	describe('libraries', () => {
		let hasLibFailed = false;
		beforeEach(() => {
			onTestFailed(() => {
				hasLibFailed = true;
			});
		});

		it('contains maplibre-gl', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl/');
			const notTiny = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
			expect(path.file('maplibre-gl.css')).toBeTruthy();
			// Bundled from the ESM-only upstream package into a classic script (see frontends/config.ts).
			expect(path.file('maplibre-gl.js')).toBeTruthy();
			expect(path.file('maplibre-gl.js.map')).toStrictEqual(notTiny);
			// The worker is loaded as a module and imports the shared chunk itself.
			expect(path.file('maplibre-gl-worker.mjs')).toBeTruthy();
			expect(path.file('maplibre-gl-shared.mjs')).toBeTruthy();
			expect(path.rest()).toStrictEqual({});
		});

		it('contains maplibre-gl-inspect', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl-inspect/');
			expect(path.file('maplibre-gl-inspect.css')).toBeTruthy();
			expect(path.file('maplibre-gl-inspect.js.map')).toBeTruthy();
			expect(path.file('maplibre-gl-inspect.js')).toBeTruthy();
			expect(path.file('maplibre-gl-inspect.mjs.map')).toBeTruthy();
			expect(path.rest()).toStrictEqual({});
		});

		// Shipped for anyone building on the bundles; no page loads it, because the frontends
		// show a single map and Compare needs two. frontend-tiny and frontend-blank leave it out.
		it('contains maplibre-gl-compare, except in frontend-tiny', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl-compare/');
			const notTinyNorBlank = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
			expect(path.file('maplibre-gl-compare.css')).toStrictEqual(notTinyNorBlank);
			expect(path.file('maplibre-gl-compare.js')).toStrictEqual(notTinyNorBlank);
			expect(path.rest()).toStrictEqual({});
		});

		// No frontend loads this any more - the pages use versatiles-geocoder below - but it is
		// still shipped for anyone building on the bundles. frontend-tiny leaves it out.
		it('contains maplibre-gl-geocoder, except in frontend-tiny', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl-geocoder/');
			const notTinyNorBlank = { frontend: true, 'frontend-dev': true, 'frontend-min': true };
			expect(path.file('maplibre-gl-geocoder.css')).toStrictEqual(notTinyNorBlank);
			expect(path.file('maplibre-gl-geocoder.js')).toStrictEqual(notTinyNorBlank);
			expect(path.file('maplibre-gl-geocoder.js.map')).toStrictEqual(notTinyNorBlank);
			expect(path.rest()).toStrictEqual({});
		});

		it('contains maplibre-versatiles-styler', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-versatiles-styler/');
			expect(path.file('maplibre-versatiles-styler.d.ts')).toBeTruthy();
			expect(path.file('maplibre-versatiles-styler.js.map')).toBeTruthy();
			expect(path.file('maplibre-versatiles-styler.js')).toBeTruthy();
			expect(path.rest()).toStrictEqual({});
		});

		it('contains versatiles-svg-renderer', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-svg-renderer/');
			expect(path.file('versatiles-svg-renderer.js')).toBeTruthy();
			expect(path.rest()).toStrictEqual({});
		});

		it('contains mapbox-gl-rtl-text', () => {
			const path = bundles.withPrefix('assets/lib/mapbox-gl-rtl-text/');
			expect(path.file('mapbox-gl-rtl-text.js')).toBeTruthy();
			expect(path.rest()).toStrictEqual({});
		});

		it('contains versatiles-style', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-style/');
			expect(path.file('versatiles-style.d.ts')).toBeTruthy();
			expect(path.file('versatiles-style.js.map')).toBeTruthy();
			expect(path.file('versatiles-style.js')).toBeTruthy();
			expect(path.rest()).toStrictEqual({});
		});

		// Not a third-party package: our own location search, served from frontends/all/ and
		// used by every frontend that has a page. frontend-blank ships no HTML, so it has none.
		it('contains versatiles-geocoder in every frontend with a page', () => {
			const path = bundles.withPrefix('assets/lib/versatiles-geocoder/');
			const withPages = { frontend: true, 'frontend-dev': true, 'frontend-min': true, 'frontend-tiny': true };
			expect(path.file('versatiles-geocoder.js')).toStrictEqual(withPages);
			expect(path.file('versatiles-geocoder.css')).toStrictEqual(withPages);
			expect(path.rest()).toStrictEqual({});
		});

		afterAll(() => {
			if (hasLibFailed) return;
			expect(bundles.withPrefix('assets/lib/').rest()).toStrictEqual({}); // no other files in lib/
		});
	});

	it('contains sprites', () => {
		const path = bundles.withPrefix('assets/sprites/');
		expect(path.file('index.json')).toBeTruthy();

		// Since versatiles-style v6 the sprites are three flat sheets - base, extras and icons -
		// listed in index.json and shipped at 1x and 2x. The @3x/@4x sheets of earlier releases
		// are gone, so frontend-tiny's *@3x/*@4x ignore rules no longer drop anything here and
		// every bundle carries the same set.
		for (const sheet of ['base', 'extras', 'icons']) {
			expect(path.count(new RegExp(`^${sheet}\\.(json|png)$`)), sheet).toBe(2);
			expect(path.count(new RegExp(`^${sheet}@2x\\.(json|png)$`)), `${sheet}@2x`).toBe(2);
		}

		// sizes() collapses to a single number only while every bundle holds the same sheets.
		expect(path.sizes(/^base(@2x)?\.(json|png)$/)).toBeGreaterThan(300e3);
		expect(path.sizes(/^extras(@2x)?\.(json|png)$/)).toBeGreaterThan(170e3);
		expect(path.sizes(/^icons(@2x)?\.(json|png)$/)).toBeGreaterThan(300e3);

		expect(path.rest()).toStrictEqual({});
	});

	it('contains no styles', () => {
		const path = bundles.withPrefix('assets/styles/');
		expect(path.rest()).toStrictEqual({});
	});

	describe('basic html files', () => {
		it('contains preview.html', () => {
			expect(bundles.withPrefix('').count(/^preview\.html$/)).toStrictEqual({
				'frontend-dev': 1,
			});
		});

		it('contains index.html', () => {
			expect(bundles.withPrefix('').file('index.html')).toBeTruthy();
		});

		it('contains robots.txt', () => {
			expect(bundles.withPrefix('').file('robots.txt')).toBeTruthy();
		});
	});

	afterAll(() => {
		if (hasAnyFailed) return;
		bundles.expectEmpty();
	});
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

describe('bundles use hardlinks for duplicated glyph ranges', () => {
	for (const ext of ['.tar.gz', '.br.tar.gz', '.tar.zst']) {
		it(`frontend-min${ext}`, async () => {
			// The italic Noto Sans faces share many ranges with the upright faces.
			const files = await listTarFiles(`frontend-min${ext}`);
			const links = files.filter((f) => f.linkTo != null);
			expect(links.length).toBeGreaterThan(0);
			expect(links.every((f) => f.name.startsWith('assets/glyphs/'))).toBe(true);
		});
	}
});
