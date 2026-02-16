import { describe, it, expect, afterAll } from 'vitest';
import { Bundles, listTarGzFiles } from './utils';

const bundles = new Bundles(
	await Promise.all(
		['frontend.tar.gz', 'frontend-dev.tar.gz', 'frontend-min.tar.gz'].map(async (name) => ({
			name,
			files: await listTarGzFiles(name),
		}))
	)
);

describe('Bundle contents', () => {
	it('contains glyphs', () => {
		const path = bundles.withPrefix('assets/glyphs/');
		expect(path.file('font_families.json')).toBeTruthy();
		expect(path.file('index.json')).toBeTruthy();

		expect(path.count(/^noto_sans_regular\/\d+-\d+\.pbf$/)).toBe(451);
		expect(path.sizes(/^noto_sans_regular\/\d+-\d+\.pbf$/)).toBeGreaterThan(38e6);

		expect(path.count(/^noto_sans_bold\/\d+-\d+\.pbf$/)).toBe(451);
		expect(path.sizes(/^noto_sans_bold\/\d+-\d+\.pbf$/)).toBeGreaterThan(40e6);

		expect(path.count(/^[a-z0-9_]+\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-dev.tar.gz': 47440,
			'frontend-min.tar.gz': 0,
			'frontend.tar.gz': 47440,
		});

		expect(path.rest()).toStrictEqual({}); // no other files in glyphs/
	});

	it('contains logo', () => {
		const path = bundles.withPrefix('assets/images/');
		expect(path.file('versatiles-logo.png')).toBeTruthy();
		expect(path.rest()).toStrictEqual({}); // no other files in images/
	});

	describe('libraries', () => {
		it('contains maplibre-gl', () => {
			const path = bundles.withPrefix('assets/lib/maplibre-gl/');
			expect(path.file('maplibre-gl.css')).toBeTruthy();
			expect(path.count(/^maplibre-gl-csp-dev\.js(\.map)?$/)).toBe(2);
			expect(path.count(/^maplibre-gl-csp-worker-dev\.js(\.map)?$/)).toBe(2);
			expect(path.count(/^maplibre-gl-csp-worker\.js(\.map)?$/)).toBe(2);
			expect(path.count(/^maplibre-gl-csp\.js(\.map)?$/)).toBe(2);
			expect(path.count(/^maplibre-gl-dev\.js(\.map)?$/)).toBe(2);
			expect(path.count(/^maplibre-gl\.js(\.map)?$/)).toBe(2);
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
			expect(bundles.withPrefix('assets/lib/').rest()).toStrictEqual({}); // no other files in lib/
		});
	});

	it('contains sprites', () => {
		const path = bundles.withPrefix('assets/sprites/');
		expect(path.file('index.json')).toBeTruthy();

		expect(path.count(/^basics\/sprites\.(json|png)$/)).toBe(2);
		expect(path.count(/^basics\/sprites@2x\.(json|png)$/)).toBe(2);
		expect(path.count(/^basics\/sprites.*\.(json|png)$/)).toStrictEqual({
			'frontend-dev.tar.gz': 4,
			'frontend-min.tar.gz': 0,
			'frontend.tar.gz': 4,
		});
		expect(path.sizes(/^basics\/sprites/)).toStrictEqual({
			'frontend-dev.tar.gz': 1100744,
			'frontend-min.tar.gz': 297444,
			'frontend.tar.gz': 1100744,
		});

		expect(path.count(/^markers\/sprites\.(json|png)$/)).toBe(2);
		expect(path.count(/^markers\/sprites@2x\.(json|png)$/)).toBe(2);
		expect(path.count(/^markers\/sprites.*\.(json|png)$/)).toStrictEqual({
			'frontend-dev.tar.gz': 4,
			'frontend-min.tar.gz': 0,
			'frontend.tar.gz': 4,
		});
		expect(path.sizes(/^markers\/sprites/)).toStrictEqual({
			'frontend-dev.tar.gz': 315407,
			'frontend-min.tar.gz': 84337,
			'frontend.tar.gz': 315407,
		});

		expect(path.rest()).toStrictEqual({});
	});

	it('contains styles', () => {
		const path = bundles.withPrefix('assets/styles/');
		expect(path.count(/^.*\/.*\.json$/)).toStrictEqual({
			'frontend-dev.tar.gz': 25,
			'frontend-min.tar.gz': 0,
			'frontend.tar.gz': 25,
		});
		expect(path.rest()).toStrictEqual({});
	});

	describe('basic html files', () => {
		it('contains preview.html', () => {
			expect(bundles.withPrefix('').count(/^preview\.html$/)).toStrictEqual({
				'frontend-dev.tar.gz': 1,
				'frontend-min.tar.gz': 0,
				'frontend.tar.gz': 0,
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
		bundles.expectEmpty();
	});
});

describe('brotli bundles match regular bundles', () => {
	for (const name of ['frontend', 'frontend-dev', 'frontend-min']) {
		it(`${name}.br.tar.gz matches ${name}.tar.gz`, async () => {
			const regular = (await listTarGzFiles(`${name}.tar.gz`)).map((f) => f.name).sort();
			const brotli = (await listTarGzFiles(`${name}.br.tar.gz`)).map((f) => f.name.slice(0, -3)).sort();
			expect(brotli).toStrictEqual(regular);
		});
	}
});
