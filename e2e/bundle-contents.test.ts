import { describe, it, expect, afterAll } from 'vitest';
import { listTarGzFiles } from './utils';

interface Bundle {
	name: string;
	files: string[];
}

class Bundles {
	private bundles: Bundle[];
	constructor(bundles: Bundle[]) {
		this.bundles = bundles;
	}
	expectEmptyPrefix(prefix: string) {
		const result = this.bundles.flatMap(({ name, files }) =>
			files.filter((f) => f.startsWith(prefix)).map((f) => `${name}: ${f}`)
		);
		expect(result).toStrictEqual([]);
	}
	expectFile(file: string) {
		const missing: string[] = [];
		for (const bundle of this.bundles) {
			let found = false;
			bundle.files = bundle.files.filter((f) => {
				if (f === file) {
					found = true;
					return false;
				}
				return true;
			});
			if (!found) missing.push(bundle.name);
		}
		expect(missing, `file "${file}" missing in bundles`).toStrictEqual([]);
	}
	countRegex(regex: RegExp): Record<string, number> {
		const results: Record<string, number> = {};
		for (const bundle of this.bundles) {
			let count = bundle.files.length;
			bundle.files = bundle.files.filter((f) => !regex.test(f));
			count -= bundle.files.length;
			results[bundle.name] = count;
		}
		return results;
	}
}

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
		bundles.expectFile('assets/glyphs/font_families.json');

		bundles.expectFile('assets/glyphs/index.json');

		expect(bundles.countRegex(/^assets\/glyphs\/noto_sans_bold\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-dev.tar.gz': 451,
			'frontend-min.tar.gz': 451,
			'frontend.tar.gz': 451,
		});

		expect(bundles.countRegex(/^assets\/glyphs\/noto_sans_regular\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-dev.tar.gz': 451,
			'frontend-min.tar.gz': 451,
			'frontend.tar.gz': 451,
		});

		expect(bundles.countRegex(/^assets\/glyphs\/[a-z0-9_]+\/\d+-\d+\.pbf$/)).toStrictEqual({
			'frontend-dev.tar.gz': 47440,
			'frontend-min.tar.gz': 0,
			'frontend.tar.gz': 47440,
		});

		bundles.expectEmptyPrefix('assets/glyphs/'); // no other files in glyphs/
	});

	it('contains logo', () => {
		bundles.expectFile('assets/images/versatiles-logo.png');
	});

	describe('libraries', () => {
		it('contains maplibre-gl', () => {
			bundles.expectFile('assets/lib/maplibre-gl/maplibre-gl.css');
			bundles.expectFile('assets/lib/maplibre-gl/maplibre-gl.js');
			expect(bundles.countRegex(/^assets\/lib\/maplibre-gl\//)).toStrictEqual({
				'frontend-dev.tar.gz': 11,
				'frontend-min.tar.gz': 0,
				'frontend.tar.gz': 11,
			});
		});

		it('contains maplibre-gl-inspect', () => {
			expect(bundles.countRegex(/^assets\/lib\/maplibre-gl-inspect\//)).toStrictEqual({
				'frontend-dev.tar.gz': 4,
				'frontend-min.tar.gz': 2,
				'frontend.tar.gz': 4,
			});
			bundles.expectEmptyPrefix('assets/lib/maplibre-gl-inspect/');
		});

		it('contains maplibre-versatiles-styler', () => {
			bundles.expectFile('assets/lib/maplibre-versatiles-styler/maplibre-versatiles-styler.js');
			expect(
				bundles.countRegex(/^assets\/lib\/maplibre-versatiles-styler\/maplibre-versatiles-styler\./)
			).toStrictEqual({
				'frontend-dev.tar.gz': 2,
				'frontend-min.tar.gz': 0,
				'frontend.tar.gz': 2,
			});
			bundles.expectEmptyPrefix('assets/lib/maplibre-versatiles-styler/');
		});

		it('contains mapbox-gl-rtl-text', () => {
			bundles.expectFile('assets/lib/mapbox-gl-rtl-text/mapbox-gl-rtl-text.js');
		});

		it('contains versatiles-style', () => {
			bundles.expectFile('assets/lib/versatiles-style/versatiles-style.js');
			expect(bundles.countRegex(/^assets\/lib\/versatiles-style\//)).toStrictEqual({
				'frontend-dev.tar.gz': 2,
				'frontend-min.tar.gz': 0,
				'frontend.tar.gz': 2,
			});
		});

		afterAll(() => {
			bundles.expectEmptyPrefix('assets/lib/'); // no other files in lib/
		});
	});

	it('contains sprites', () => {
		bundles.expectFile('assets/sprites/index.json');
		expect(bundles.countRegex(/^assets\/sprites\/basics\/sprites.*\.(json|png)$/)).toStrictEqual({
			'frontend-dev.tar.gz': 8,
			'frontend-min.tar.gz': 4,
			'frontend.tar.gz': 8,
		});
	});

	it('contains styles', () => {
		expect(bundles.countRegex(/^assets\/styles\/.*\/.*\.json$/)).toStrictEqual({
			'frontend-dev.tar.gz': 25,
			'frontend-min.tar.gz': 0,
			'frontend.tar.gz': 25,
		});
	});

	describe('basic html files', () => {
		it('contains preview.html', () => {
			expect(bundles.countRegex(/^preview\.html$/)).toStrictEqual({
				'frontend-dev.tar.gz': 1,
				'frontend-min.tar.gz': 0,
				'frontend.tar.gz': 0,
			});
		});

		it('contains index.html', () => {
			bundles.expectFile('index.html');
		});

		it('contains robots.txt', () => {
			bundles.expectFile('robots.txt');
		});
	});

	afterAll(() => {
		bundles.expectEmptyPrefix('');
	});
});

describe('brotli bundles match regular bundles', () => {
	for (const name of ['frontend', 'frontend-dev', 'frontend-min']) {
		it(`${name}.br.tar.gz matches ${name}.tar.gz`, async () => {
			const regular = await listTarGzFiles(`${name}.tar.gz`);
			const brotli = await listTarGzFiles(`${name}.br.tar.gz`);
			expect(brotli).toStrictEqual(regular.map((f) => f + '.br'));
		});
	}
});
