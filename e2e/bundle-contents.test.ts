import { describe, it, expect, beforeAll } from 'vitest';
import { hasRelease, listTarGzFiles } from './utils';

describe.skipIf(!hasRelease)('bundle contents', () => {
	const bundles = new Map<string, string[]>();

	beforeAll(async () => {
		const names = [
			'frontend.tar.gz', 'frontend.br.tar.gz',
			'frontend-dev.tar.gz', 'frontend-dev.br.tar.gz',
			'frontend-min.tar.gz', 'frontend-min.br.tar.gz',
		];
		await Promise.all(names.map(async (name) => {
			bundles.set(name, await listTarGzFiles(name));
		}));
	});

	function files(name: string): string[] {
		return bundles.get(name)!;
	}

	describe('all bundles exist and are non-empty', () => {
		for (const name of [
			'frontend.tar.gz', 'frontend.br.tar.gz',
			'frontend-dev.tar.gz', 'frontend-dev.br.tar.gz',
			'frontend-min.tar.gz', 'frontend-min.br.tar.gz',
		]) {
			it(name, () => {
				expect(files(name).length).toBeGreaterThan(0);
			});
		}
	});

	describe('brotli bundles match regular bundles', () => {
		for (const name of ['frontend', 'frontend-dev', 'frontend-min']) {
			it(`${name}.br.tar.gz matches ${name}.tar.gz`, () => {
				const regular = files(`${name}.tar.gz`);
				const brotli = files(`${name}.br.tar.gz`);
				expect(brotli).toStrictEqual(regular.map(f => f + '.br'));
			});
		}
	});

	describe('frontend.tar.gz', () => {
		it('contains static files', () => {
			const f = files('frontend.tar.gz');
			expect(f).toContain('index.html');
			expect(f).toContain('robots.txt');
			expect(f).toContain('assets/images/versatiles-logo.png');
		});

		it('does not contain preview.html', () => {
			expect(files('frontend.tar.gz')).not.toContain('preview.html');
		});

		it('contains maplibre-gl', () => {
			const f = files('frontend.tar.gz');
			expect(f).toContain('assets/lib/maplibre-gl/maplibre-gl.js');
			expect(f).toContain('assets/lib/maplibre-gl/maplibre-gl.css');
			expect(f).toContain('assets/lib/maplibre-gl/maplibre-gl.js.map');
		});

		it('contains maplibre-gl-inspect', () => {
			const f = files('frontend.tar.gz');
			expect(f).toContain('assets/lib/maplibre-gl-inspect/maplibre-gl-inspect.js');
			expect(f).toContain('assets/lib/maplibre-gl-inspect/maplibre-gl-inspect.css');
		});

		it('contains versatiles-style', () => {
			const f = files('frontend.tar.gz');
			expect(f).toContain('assets/lib/versatiles-style/versatiles-style.js');
		});

		it('contains mapbox-gl-rtl-text', () => {
			expect(files('frontend.tar.gz')).toContain('assets/lib/mapbox-gl-rtl-text/mapbox-gl-rtl-text.js');
		});

		it('contains styles', () => {
			const styles = files('frontend.tar.gz').filter(f => f.startsWith('assets/styles/'));
			expect(styles.length).toBeGreaterThan(0);
		});

		it('contains sprites', () => {
			const sprites = files('frontend.tar.gz').filter(f => f.startsWith('assets/sprites/'));
			expect(sprites.length).toBeGreaterThan(0);
		});

		it('contains glyph files', () => {
			const glyphs = files('frontend.tar.gz').filter(f => f.startsWith('assets/glyphs/'));
			expect(glyphs.length).toBeGreaterThan(100);
		});
	});

	describe('frontend-dev.tar.gz', () => {
		it('contains preview.html', () => {
			expect(files('frontend-dev.tar.gz')).toContain('preview.html');
		});

		it('contains the same files as frontend plus preview.html', () => {
			const regular = new Set(files('frontend.tar.gz'));
			const dev = new Set(files('frontend-dev.tar.gz'));
			// frontend-dev should have everything frontend has
			for (const f of regular) {
				expect(dev.has(f), `missing: ${f}`).toBe(true);
			}
			// the only extra file should be preview.html
			const extra = [...dev].filter(f => !regular.has(f));
			expect(extra).toStrictEqual(['preview.html']);
		});
	});

	describe('frontend-min.tar.gz', () => {
		it('contains static files', () => {
			const f = files('frontend-min.tar.gz');
			expect(f).toContain('index.html');
			expect(f).toContain('robots.txt');
			expect(f).toContain('assets/images/versatiles-logo.png');
		});

		it('contains core libraries', () => {
			const f = files('frontend-min.tar.gz');
			expect(f).toContain('assets/lib/maplibre-gl/maplibre-gl.js');
			expect(f).toContain('assets/lib/maplibre-gl/maplibre-gl.css');
			expect(f).toContain('assets/lib/versatiles-style/versatiles-style.js');
			expect(f).toContain('assets/lib/mapbox-gl-rtl-text/mapbox-gl-rtl-text.js');
		});

		it('does not contain .map files', () => {
			const mapFiles = files('frontend-min.tar.gz').filter(f => f.endsWith('.map'));
			expect(mapFiles).toStrictEqual([]);
		});

		it('does not contain .d.ts files', () => {
			const dtsFiles = files('frontend-min.tar.gz').filter(f => f.endsWith('.d.ts'));
			expect(dtsFiles).toStrictEqual([]);
		});

		it('does not contain @3x or @4x sprites', () => {
			const f = files('frontend-min.tar.gz');
			expect(f.filter(n => /@3x\./.test(n))).toStrictEqual([]);
			expect(f.filter(n => /@4x\./.test(n))).toStrictEqual([]);
		});

		it('does not contain styles directory', () => {
			const styles = files('frontend-min.tar.gz').filter(f => f.startsWith('assets/styles/'));
			expect(styles).toStrictEqual([]);
		});

		it('does not contain maplibre-gl-csp or maplibre-gl-dev variants', () => {
			const f = files('frontend-min.tar.gz');
			expect(f.filter(n => n.includes('maplibre-gl-csp'))).toStrictEqual([]);
			expect(f.filter(n => n.includes('maplibre-gl-dev'))).toStrictEqual([]);
		});

		it('does not contain preview.html', () => {
			expect(files('frontend-min.tar.gz')).not.toContain('preview.html');
		});

		it('contains glyph files (noto only, fewer than full frontend)', () => {
			const minGlyphs = files('frontend-min.tar.gz').filter(f => f.startsWith('assets/glyphs/'));
			const fullGlyphs = files('frontend.tar.gz').filter(f => f.startsWith('assets/glyphs/'));
			expect(minGlyphs.length).toBeGreaterThan(100);
			expect(minGlyphs.length).toBeLessThan(fullGlyphs.length);
		});
	});
});
