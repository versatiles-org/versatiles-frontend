import { describe, it, expect, afterAll, beforeEach, onTestFailed } from 'vitest';
import { Bundles, listTarGzFiles } from './utils';

function expectMinSizes(actual: Record<string, number> | number, expected: Record<string, number>) {
	for (const [bundle, min] of Object.entries(expected)) {
		const value = typeof actual === 'number' ? actual : actual[bundle];
		expect(value, `size in ${bundle}`).toBeGreaterThan(min);
	}
}

const BUNDLE_NAMES = ['frontend', 'frontend-dev', 'frontend-min', 'frontend-tiny'] as const;

const bundles = new Bundles(
	await Promise.all(
		BUNDLE_NAMES.map(async (name) => ({
			name,
			files: await listTarGzFiles(name + '.tar.gz'),
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

		expect(path.count(/^noto_sans_regular\/\d+-\d+\.pbf$/)).toStrictEqual({
			frontend: 405,
			'frontend-dev': 405,
			'frontend-min': 405,
			'frontend-tiny': 15,
		});
		expectMinSizes(path.sizes(/^noto_sans_regular\/\d+-\d+\.pbf$/), {
			frontend: 38e6,
			'frontend-dev': 38e6,
			'frontend-min': 38e6,
			'frontend-tiny': 1e6,
		});

		expect(path.count(/^noto_sans_bold\/\d+-\d+\.pbf$/)).toStrictEqual({
			frontend: 405,
			'frontend-dev': 405,
			'frontend-min': 405,
			'frontend-tiny': 15,
		});
		expectMinSizes(path.sizes(/^noto_sans_bold\/\d+-\d+\.pbf$/), {
			frontend: 40e6,
			'frontend-dev': 40e6,
			'frontend-min': 40e6,
			'frontend-tiny': 1e6,
		});

		expect(path.count(/^[a-z0-9_]+\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-dev': 3244,
			frontend: 3244,
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
			expect(path.file('maplibre-gl.js')).toBeTruthy();
			expect(path.file('maplibre-gl.js.map')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-csp.js')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-csp.js.map')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-csp-dev.js')).toBeTruthy();
			expect(path.file('maplibre-gl-csp-dev.js.map')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-csp-worker.js')).toBeTruthy();
			expect(path.file('maplibre-gl-csp-worker.js.map')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-csp-worker-dev.js')).toBeTruthy();
			expect(path.file('maplibre-gl-csp-worker-dev.js.map')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-dev.js')).toStrictEqual(notTiny);
			expect(path.file('maplibre-gl-dev.js.map')).toStrictEqual(notTiny);
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
			expect(path.file('versatiles-svg-renderer.js.map')).toBeTruthy();
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

		afterAll(() => {
			if (hasLibFailed) return;
			expect(bundles.withPrefix('assets/lib/').rest()).toStrictEqual({}); // no other files in lib/
		});
	});

	it('contains sprites', () => {
		const path = bundles.withPrefix('assets/sprites/');
		expect(path.file('index.json')).toBeTruthy();

		expect(path.count(/^basics\/sprites\.(json|png)$/)).toBe(2);
		expect(path.count(/^basics\/sprites@2x\.(json|png)$/)).toBe(2);
		expect(path.count(/^basics\/sprites.*\.(json|png)$/)).toStrictEqual({
			frontend: 4,
			'frontend-dev': 4,
		});
		expectMinSizes(path.sizes(/^basics\/sprites/), {
			frontend: 1e6,
			'frontend-dev': 1e6,
			'frontend-min': 250e3,
			'frontend-tiny': 250e3,
		});

		expect(path.count(/^markers\/sprites\.(json|png)$/)).toBe(2);
		expect(path.count(/^markers\/sprites@2x\.(json|png)$/)).toBe(2);
		expect(path.count(/^markers\/sprites.*\.(json|png)$/)).toStrictEqual({
			frontend: 4,
			'frontend-dev': 4,
		});
		expectMinSizes(path.sizes(/^markers\/sprites/), {
			frontend: 300e3,
			'frontend-dev': 300e3,
			'frontend-min': 80e3,
			'frontend-tiny': 80e3,
		});

		expect(path.rest()).toStrictEqual({});
	});

	it('contains styles', () => {
		const path = bundles.withPrefix('assets/styles/');
		expect(path.count(/^.*\/.*\.json$/)).toStrictEqual({
			frontend: 25,
			'frontend-dev': 25,
		});
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
	for (const name of BUNDLE_NAMES) {
		it(`${name}.br.tar.gz matches ${name}.tar.gz`, async () => {
			const regular = (await listTarGzFiles(`${name}.tar.gz`)).map((f) => f.name).sort();
			const brotli = (await listTarGzFiles(`${name}.br.tar.gz`)).map((f) => f.name.slice(0, -3)).sort();
			expect(brotli).toStrictEqual(regular);
		});
	}
});
