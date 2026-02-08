import { describe, it, expect, beforeAll } from 'vitest';
import { hasRelease, listTarGzFiles, groupByFolder, filesInFolder } from './utils';

describe.skipIf(!hasRelease)('bundle contents', () => {
	const bundles = new Map<string, string[]>();

	beforeAll(async () => {
		const names = [
			'frontend.tar.gz',
			'frontend.br.tar.gz',
			'frontend-dev.tar.gz',
			'frontend-dev.br.tar.gz',
			'frontend-min.tar.gz',
			'frontend-min.br.tar.gz',
		];
		await Promise.all(
			names.map(async (name) => {
				bundles.set(name, await listTarGzFiles(name));
			})
		);
	});

	function files(name: string): string[] {
		return bundles.get(name)!;
	}

	// ── Brotli consistency ──────────────────────────────────────────────

	describe('brotli bundles match regular bundles', () => {
		for (const name of ['frontend', 'frontend-dev', 'frontend-min']) {
			it(`${name}.br.tar.gz matches ${name}.tar.gz`, () => {
				const regular = files(`${name}.tar.gz`);
				const brotli = files(`${name}.br.tar.gz`);
				expect(brotli).toStrictEqual(regular.map((f) => f + '.br'));
			});
		}
	});

	// ── frontend-dev = frontend + preview.html ──────────────────────────

	describe('frontend-dev vs frontend', () => {
		it('contains exactly the same files as frontend plus preview.html', () => {
			const regular = new Set(files('frontend.tar.gz'));
			const dev = new Set(files('frontend-dev.tar.gz'));
			const extra = [...dev].filter((f) => !regular.has(f));
			const missing = [...regular].filter((f) => !dev.has(f));
			expect(missing).toStrictEqual([]);
			expect(extra).toStrictEqual(['preview.html']);
		});
	});

	// ── frontend.tar.gz ─────────────────────────────────────────────────

	describe('frontend.tar.gz', () => {
		describe('root files', () => {
			it('contains exactly index.html and robots.txt', () => {
				const rootFiles = files('frontend.tar.gz').filter((f) => !f.includes('/'));
				expect(rootFiles).toStrictEqual(['index.html', 'robots.txt']);
			});
		});

		describe('assets/images/', () => {
			it('contains exactly versatiles-logo.png', () => {
				expect(filesInFolder(files('frontend.tar.gz'), 'assets/images/')).toStrictEqual(['versatiles-logo.png']);
			});
		});

		describe('assets/glyphs/', () => {
			it('contains index.json and font_families.json', () => {
				const glyphRoot = files('frontend.tar.gz').filter(
					(f) => f.startsWith('assets/glyphs/') && !f.slice('assets/glyphs/'.length).includes('/')
				);
				expect(glyphRoot.sort()).toStrictEqual(['assets/glyphs/font_families.json', 'assets/glyphs/index.json']);
			});

			it('has at least 100 font families', () => {
				const families = groupByFolder(files('frontend.tar.gz'), 'assets/glyphs/');
				expect(families.size).toBeGreaterThanOrEqual(100);
			});

			it('every font family contains only .pbf files, at least 200 each', () => {
				const families = groupByFolder(files('frontend.tar.gz'), 'assets/glyphs/');
				for (const [family, pbfFiles] of families) {
					expect(pbfFiles.length, `${family}: too few files`).toBeGreaterThanOrEqual(200);
					for (const f of pbfFiles) {
						expect(f, `${family}: unexpected file`).toMatch(/^\d+-\d+\.pbf$/);
					}
				}
			});
		});

		describe('assets/styles/', () => {
			it('contains exactly the expected style themes', () => {
				const themes = [...groupByFolder(files('frontend.tar.gz'), 'assets/styles/').keys()].sort();
				expect(themes).toStrictEqual(['colorful', 'eclipse', 'empty', 'graybeard', 'neutrino', 'shadow']);
			});

			it('each non-empty theme has style.json + language variants', () => {
				const themes = groupByFolder(files('frontend.tar.gz'), 'assets/styles/');
				for (const [theme, themeFiles] of themes) {
					expect(themeFiles, `${theme}: must include style.json`).toContain('style.json');
					if (theme !== 'empty') {
						expect(themeFiles.sort(), `${theme}: must have language variants`).toStrictEqual([
							'de.json',
							'en.json',
							'nolabel.json',
							'style.json',
						]);
					}
				}
			});

			it('empty theme has only style.json', () => {
				const themes = groupByFolder(files('frontend.tar.gz'), 'assets/styles/');
				expect(themes.get('empty')).toStrictEqual(['style.json']);
			});
		});

		describe('assets/sprites/', () => {
			it('contains index.json at root', () => {
				expect(files('frontend.tar.gz')).toContain('assets/sprites/index.json');
			});

			it('contains exactly basics and markers sprite sets', () => {
				const sets = [...groupByFolder(files('frontend.tar.gz'), 'assets/sprites/').keys()].sort();
				expect(sets).toStrictEqual(['basics', 'markers']);
			});

			it('each sprite set has all resolutions (1x, 2x, 3x, 4x) with .json + .png', () => {
				const sets = groupByFolder(files('frontend.tar.gz'), 'assets/sprites/');
				for (const [name, spriteFiles] of sets) {
					expect(spriteFiles.sort(), name).toStrictEqual([
						'sprites.json',
						'sprites.png',
						'sprites@2x.json',
						'sprites@2x.png',
						'sprites@3x.json',
						'sprites@3x.png',
						'sprites@4x.json',
						'sprites@4x.png',
					]);
				}
			});
		});

		describe('assets/lib/', () => {
			it('contains exactly the expected libraries', () => {
				const libs = [...groupByFolder(files('frontend.tar.gz'), 'assets/lib/').keys()].sort();
				expect(libs).toStrictEqual([
					'mapbox-gl-rtl-text',
					'maplibre-gl',
					'maplibre-gl-inspect',
					'style-selector',
					'versatiles-style',
				]);
			});

			it('maplibre-gl contains expected files', () => {
				const libFiles = filesInFolder(files('frontend.tar.gz'), 'assets/lib/maplibre-gl/');
				expect(libFiles).toContain('maplibre-gl.js');
				expect(libFiles).toContain('maplibre-gl.css');
				expect(libFiles).toContain('maplibre-gl.js.map');
				// verify all files are .js, .css, or .map
				for (const f of libFiles) {
					expect(f).toMatch(/\.(js|css|map)$/);
				}
			});

			it('maplibre-gl-inspect contains expected files', () => {
				const libFiles = filesInFolder(files('frontend.tar.gz'), 'assets/lib/maplibre-gl-inspect/');
				expect(libFiles).toContain('maplibre-gl-inspect.js');
				expect(libFiles).toContain('maplibre-gl-inspect.css');
				for (const f of libFiles) {
					expect(f).toMatch(/\.(js|css|map)$/);
				}
			});

			it('versatiles-style contains expected files', () => {
				const libFiles = filesInFolder(files('frontend.tar.gz'), 'assets/lib/versatiles-style/');
				expect(libFiles).toContain('versatiles-style.js');
				for (const f of libFiles) {
					expect(f).toMatch(/\.(js|css|map|d\.ts)$/);
				}
			});

			it('mapbox-gl-rtl-text contains expected files', () => {
				expect(filesInFolder(files('frontend.tar.gz'), 'assets/lib/mapbox-gl-rtl-text/')).toStrictEqual([
					'mapbox-gl-rtl-text.js',
				]);
			});

			it('style-selector contains expected files', () => {
				const libFiles = filesInFolder(files('frontend.tar.gz'), 'assets/lib/style-selector/');
				for (const f of libFiles) {
					expect(f).toMatch(/\.(js|css|map)$/);
				}
			});
		});

		describe('no unexpected top-level paths', () => {
			it('all files are under known prefixes', () => {
				const knownPrefixes = [
					'index.html',
					'robots.txt',
					'assets/images/',
					'assets/glyphs/',
					'assets/styles/',
					'assets/sprites/',
					'assets/lib/',
				];
				for (const f of files('frontend.tar.gz')) {
					const matchesKnown = knownPrefixes.some((p) => f === p || f.startsWith(p));
					expect(matchesKnown, `unexpected file: ${f}`).toBe(true);
				}
			});
		});
	});

	// ── frontend-min.tar.gz ─────────────────────────────────────────────

	describe('frontend-min.tar.gz', () => {
		describe('root files', () => {
			it('contains exactly index.html and robots.txt', () => {
				const rootFiles = files('frontend-min.tar.gz').filter((f) => !f.includes('/'));
				expect(rootFiles).toStrictEqual(['index.html', 'robots.txt']);
			});
		});

		describe('assets/glyphs/', () => {
			it('contains index.json and font_families.json', () => {
				const glyphRoot = files('frontend-min.tar.gz').filter(
					(f) => f.startsWith('assets/glyphs/') && !f.slice('assets/glyphs/'.length).includes('/')
				);
				expect(glyphRoot.sort()).toStrictEqual(['assets/glyphs/font_families.json', 'assets/glyphs/index.json']);
			});

			it('contains only noto_sans font families', () => {
				const families = [...groupByFolder(files('frontend-min.tar.gz'), 'assets/glyphs/').keys()].sort();
				expect(families).toStrictEqual(['noto_sans_bold', 'noto_sans_regular']);
			});

			it('each noto_sans family has at least 200 .pbf files', () => {
				const families = groupByFolder(files('frontend-min.tar.gz'), 'assets/glyphs/');
				for (const [family, pbfFiles] of families) {
					expect(pbfFiles.length, `${family}: too few files`).toBeGreaterThanOrEqual(200);
					for (const f of pbfFiles) {
						expect(f, `${family}: unexpected file`).toMatch(/^\d+-\d+\.pbf$/);
					}
				}
			});

			it('has fewer glyph files than the full frontend', () => {
				const minGlyphs = files('frontend-min.tar.gz').filter((f) => f.startsWith('assets/glyphs/'));
				const fullGlyphs = files('frontend.tar.gz').filter((f) => f.startsWith('assets/glyphs/'));
				expect(minGlyphs.length).toBeLessThan(fullGlyphs.length);
			});
		});

		describe('ignore patterns are applied', () => {
			it('contains no .map files', () => {
				expect(files('frontend-min.tar.gz').filter((f) => f.endsWith('.map'))).toStrictEqual([]);
			});

			it('contains no .d.ts files', () => {
				expect(files('frontend-min.tar.gz').filter((f) => f.endsWith('.d.ts'))).toStrictEqual([]);
			});

			it('contains no @3x or @4x sprites', () => {
				expect(files('frontend-min.tar.gz').filter((f) => /@[34]x\./.test(f))).toStrictEqual([]);
			});

			it('contains no assets/styles/ directory', () => {
				expect(files('frontend-min.tar.gz').filter((f) => f.startsWith('assets/styles/'))).toStrictEqual([]);
			});

			it('contains no maplibre-gl-csp or maplibre-gl-dev variants', () => {
				const f = files('frontend-min.tar.gz');
				expect(f.filter((n) => n.includes('maplibre-gl-csp'))).toStrictEqual([]);
				expect(f.filter((n) => n.includes('maplibre-gl-dev'))).toStrictEqual([]);
			});
		});

		describe('assets/sprites/', () => {
			it('contains index.json at root', () => {
				expect(files('frontend-min.tar.gz')).toContain('assets/sprites/index.json');
			});

			it('contains exactly basics and markers sprite sets', () => {
				const sets = [...groupByFolder(files('frontend-min.tar.gz'), 'assets/sprites/').keys()].sort();
				expect(sets).toStrictEqual(['basics', 'markers']);
			});

			it('each sprite set has only 1x and 2x resolutions', () => {
				const sets = groupByFolder(files('frontend-min.tar.gz'), 'assets/sprites/');
				for (const [name, spriteFiles] of sets) {
					expect(spriteFiles.sort(), name).toStrictEqual([
						'sprites.json',
						'sprites.png',
						'sprites@2x.json',
						'sprites@2x.png',
					]);
				}
			});
		});

		describe('assets/lib/', () => {
			it('contains exactly the expected (minimal) libraries', () => {
				const libs = [...groupByFolder(files('frontend-min.tar.gz'), 'assets/lib/').keys()].sort();
				expect(libs).toStrictEqual(['mapbox-gl-rtl-text', 'maplibre-gl', 'versatiles-style']);
			});

			it('maplibre-gl contains only .js and .css (no .map)', () => {
				expect(filesInFolder(files('frontend-min.tar.gz'), 'assets/lib/maplibre-gl/')).toStrictEqual([
					'maplibre-gl.css',
					'maplibre-gl.js',
				]);
			});

			it('versatiles-style contains only .js', () => {
				expect(filesInFolder(files('frontend-min.tar.gz'), 'assets/lib/versatiles-style/')).toStrictEqual([
					'versatiles-style.js',
				]);
			});

			it('mapbox-gl-rtl-text contains only .js', () => {
				expect(filesInFolder(files('frontend-min.tar.gz'), 'assets/lib/mapbox-gl-rtl-text/')).toStrictEqual([
					'mapbox-gl-rtl-text.js',
				]);
			});
		});

		describe('no unexpected top-level paths', () => {
			it('all files are under known prefixes', () => {
				const knownPrefixes = [
					'index.html',
					'robots.txt',
					'assets/images/',
					'assets/glyphs/',
					'assets/sprites/',
					'assets/lib/',
				];
				for (const f of files('frontend-min.tar.gz')) {
					const matchesKnown = knownPrefixes.some((p) => f === p || f.startsWith(p));
					expect(matchesKnown, `unexpected file: ${f}`).toBe(true);
				}
			});
		});
	});
});
