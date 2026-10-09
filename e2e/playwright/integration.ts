import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

/**
 * Tests that every bundle with pages runs, from its own spec file: that the tools it ships are
 * there and work, and that the pages take everything from the server that serves them. A frontend runs on a server of its own, often
 * without access to the internet, so a request to another host (e.g. tiles.versatiles.org) is a
 * misconfiguration, even if it happens to work here.
 */

export interface BundleFeatures {
	/** The page with the main map. */
	mapPage: string;
	/** Whether the main map has the styler, which can switch the style. */
	styler: boolean;
	/** Whether the main map has the inspect control and the SVG export. */
	tools: boolean;
	/** Whether the bundle contains the map editor at /editor/. */
	editor: boolean;
	/** The libraries in assets/lib/ for pages of the user, by the global each one registers. */
	libraries: string[];
}

/** The files of each library, and the function it registers as a global. */
const LIBRARIES: Record<string, { scripts: string[]; styles: string[]; global: string }> = {
	compare: {
		scripts: ['maplibre-gl-compare/maplibre-gl-compare.js'],
		styles: ['maplibre-gl-compare/maplibre-gl-compare.css'],
		global: 'maplibregl.Compare',
	},
	geocoder: {
		scripts: ['maplibre-gl-geocoder/maplibre-gl-geocoder.js'],
		styles: ['maplibre-gl-geocoder/maplibre-gl-geocoder.css'],
		global: 'MaplibreGeocoder',
	},
	inspect: {
		scripts: ['maplibre-gl-inspect/maplibre-gl-inspect.js'],
		styles: ['maplibre-gl-inspect/maplibre-gl-inspect.css'],
		global: 'MaplibreInspect',
	},
	style: {
		scripts: ['versatiles-style/versatiles-style.js'],
		styles: [],
		global: 'VersaTilesStyle.osm',
	},
	styler: {
		scripts: ['maplibre-versatiles-styler/maplibre-versatiles-styler.js'],
		styles: [],
		global: 'VersaTilesStylerControl',
	},
	svg: {
		scripts: ['versatiles-svg-renderer/versatiles-svg-renderer.js'],
		styles: [],
		global: 'VersaTilesSVG.SVGExportControl',
	},
	'versatiles-geocoder': {
		scripts: ['versatiles-geocoder/versatiles-geocoder.js'],
		styles: ['versatiles-geocoder/versatiles-geocoder.css'],
		global: 'createVersaTilesGeocoder',
	},
};

/**
 * Lets only requests to the server of the bundle through, and records the others. Covers the
 * workers of the page too, which load the tiles.
 */
class HostGuard {
	/** The URLs of the blocked requests to other hosts. */
	readonly foreign: string[] = [];
	/** The paths of the requests to the server of the bundle. */
	readonly local: string[] = [];

	/** Must be called before page.goto(). */
	static async install(page: Page, serverUrl: string): Promise<HostGuard> {
		const guard = new HostGuard();
		await page.context().route('**/*', async (route) => {
			const url = route.request().url();
			if (url.startsWith(serverUrl + '/')) {
				guard.local.push(url.slice(serverUrl.length));
				await route.fallback();
			} else {
				guard.foreign.push(url);
				await route.abort('blockedbyclient');
			}
		});
		return guard;
	}

	/**
	 * Waits for the promise, but fails as soon as a request to another host is blocked: the page
	 * would otherwise wait for what never comes, and fail by a timeout that does not name the cause.
	 */
	async until<T>(promise: Promise<T>): Promise<T> {
		let timer: ReturnType<typeof setInterval> | undefined;
		const blocked = new Promise<never>((_, reject) => {
			timer = setInterval(() => {
				if (this.foreign.length > 0) reject(new Error(`Requested another host: ${this.foreign.join(', ')}`));
			}, 100);
		});
		try {
			return await Promise.race([promise, blocked]);
		} finally {
			clearInterval(timer);
		}
	}

	/** Waits for a request to the server whose path matches the pattern. */
	async waitForLocal(pattern: RegExp): Promise<void> {
		await this.until(expect.poll(() => this.local.some((path) => pattern.test(path)), { timeout: 20_000 }).toBe(true));
	}

	/** Expects requests to each of the paths, by their start, and none to another host. */
	expectOnlyThisHost(paths: string[]) {
		for (const path of paths) {
			expect
				.soft(
					this.local.some((p) => p.startsWith(path)),
					`requested ${path}`
				)
				.toBe(true);
		}
		expect(this.foreign).toStrictEqual([]);
	}
}

/** Exposes the map instance of the page as window.__map. Must be called before page.goto(). */
async function exposeMap(page: Page) {
	await page.addInitScript(() => {
		let _ml: unknown;
		Object.defineProperty(window, 'maplibregl', {
			configurable: true,
			enumerable: true,
			get() {
				return _ml;
			},
			set(val: Record<string, unknown>) {
				_ml = val;
				if (val?.Map) {
					const OrigMap = val.Map as new (...args: unknown[]) => unknown;
					val.Map = function (...args: unknown[]) {
						const instance = new OrigMap(...args);
						(window as unknown as Record<string, unknown>).__map = instance;
						return instance;
					};
					(val.Map as Record<string, unknown>).prototype = OrigMap.prototype;
					Object.setPrototypeOf(val.Map, OrigMap);
				}
			},
		});
	});
}

interface ExposedMap {
	loaded(): boolean;
	getStyle(): { layers: { id: string }[] };
}

/** Waits until the exposed map has loaded its style and the tiles in view. */
async function waitForMapLoaded(page: Page) {
	await page.locator('.maplibregl-canvas').first().waitFor({ state: 'attached', timeout: 20_000 });
	await page.waitForFunction(() => (window as unknown as { __map?: ExposedMap }).__map?.loaded(), null, {
		timeout: 20_000,
	});
	await page.waitForLoadState('networkidle');
}

/** The ids of the layers of the exposed map. */
async function layerIds(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		(window as unknown as { __map: ExposedMap }).__map.getStyle().layers.map((layer) => layer.id)
	);
}

/** Defines the tests for the bundle of the spec file, which has the given features. */
export function testIntegration(features: BundleFeatures) {
	test.describe('integration', () => {
		test('main map loads everything from this host', async ({ page, serverUrl }) => {
			const guard = await HostGuard.install(page, serverUrl);
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));
			await exposeMap(page);

			await page.goto(serverUrl + features.mapPage);
			await guard.until(waitForMapLoaded(page));

			if (features.styler) {
				// Another style loads its own sprites and fonts.
				await page.getByRole('button', { name: /^Base style:/ }).click();
				await page.locator('label[title="gray-dark"]').click();
				await expect(page.getByRole('button', { name: 'Base style: gray-dark' })).toBeVisible();
				await guard.until(waitForMapLoaded(page));
			}

			guard.expectOnlyThisHost(['/tiles/osm/', '/assets/glyphs/', '/assets/sprites/']);
			expect(errors).toStrictEqual([]);
		});

		if (features.editor) {
			test('map editor loads everything from this host', async ({ page, serverUrl }) => {
				const guard = await HostGuard.install(page, serverUrl);
				const errors: string[] = [];
				page.on('pageerror', (err) => errors.push(err.message));

				await page.goto(`${serverUrl}/editor/`);
				await expect(page).toHaveTitle('VersaTiles Map Editor');
				await guard.waitForLocal(/^\/tiles\/osm\/\d+\/\d+\/\d+/);

				// The satellite background is the other tile source the editor uses.
				await page.getByRole('radio', { name: 'Satellite' }).click();
				await guard.waitForLocal(/^\/tiles\/satellite\/\d+\/\d+\/\d+/);
				await guard.until(page.waitForLoadState('networkidle'));

				guard.expectOnlyThisHost([
					'/editor/map-editor.config.jsonc',
					'/tiles/osm/',
					'/tiles/satellite/',
					'/assets/glyphs/',
					'/assets/sprites/',
				]);
				expect(errors).toStrictEqual([]);
			});

			test('map viewer of shared maps loads', async ({ page, serverUrl }) => {
				const guard = await HostGuard.install(page, serverUrl);
				const errors: string[] = [];
				page.on('pageerror', (err) => errors.push(err.message));

				await page.goto(`${serverUrl}/editor/view/`);
				await guard.waitForLocal(/^\/tiles\/osm\/\d+\/\d+\/\d+/);
				await guard.until(page.waitForLoadState('networkidle'));

				await expect(page.locator('.maplibregl-canvas')).toBeAttached();
				guard.expectOnlyThisHost(['/editor/map-editor.config.jsonc', '/tiles/osm/']);
				expect(errors).toStrictEqual([]);
			});
		} else {
			test('has no map editor', async ({ page, serverUrl }) => {
				const response = await page.goto(`${serverUrl}/editor/`);
				expect(response?.status()).toBe(404);
			});
		}

		if (features.styler) {
			test('styler switches the style of the map', async ({ page, serverUrl }) => {
				await exposeMap(page);
				await page.goto(serverUrl + features.mapPage);
				await waitForMapLoaded(page);
				const before = await layerIds(page);

				// The satellite style has layers of its own, unlike the themes of the vector map.
				await page.getByRole('button', { name: /^Base style:/ }).click();
				await page.locator('label[title="satellite"]').click();
				await waitForMapLoaded(page);

				expect(await layerIds(page)).not.toStrictEqual(before);
			});
		}

		if (features.tools) {
			test('inspect control toggles the inspection of the tiles', async ({ page, serverUrl }) => {
				await exposeMap(page);
				await page.goto(serverUrl + features.mapPage);
				await waitForMapLoaded(page);
				const before = await layerIds(page);

				// The button changes its class while inspecting, so it is found by its name.
				await page.getByRole('button', { name: 'Toggle Inspect' }).click();
				await expect.poll(() => layerIds(page)).not.toStrictEqual(before);

				await page.getByRole('button', { name: 'Toggle Inspect' }).click();
				await expect.poll(() => layerIds(page)).toStrictEqual(before);
			});

			test('SVG export renders the map', async ({ page, serverUrl }) => {
				await exposeMap(page);
				await page.goto(serverUrl + features.mapPage);
				await waitForMapLoaded(page);

				await page.locator('.svg-export-btn').click();
				const panel = page.locator('.svg-export-panel');
				await expect(panel).toBeVisible();
				await expect(panel.frameLocator('iframe').locator('svg')).toBeAttached();
				await expect(panel.getByRole('button', { name: 'Download' })).toBeVisible();
			});
		}

		test('every library loads and registers itself', async ({ page, serverUrl }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));
			// An empty page of the server, so the libraries load as they would on a page of the user.
			await page.goto(`${serverUrl}/robots.txt`);

			const libraries = features.libraries.map((name) => LIBRARIES[name]);
			const scripts = ['maplibre-gl/maplibre-gl.js', ...libraries.flatMap((lib) => lib.scripts)];
			const styles = ['maplibre-gl/maplibre-gl.css', ...libraries.flatMap((lib) => lib.styles)];

			const result = await page.evaluate(
				async ({ scripts, styles, globals }) => {
					for (const src of scripts) {
						await new Promise((resolve, reject) => {
							const script = document.createElement('script');
							script.src = `/assets/lib/${src}`;
							script.onload = resolve;
							script.onerror = () => reject(new Error(`could not load ${src}`));
							document.head.append(script);
						});
					}
					const missingStyles = [];
					for (const href of styles) {
						if (!(await fetch(`/assets/lib/${href}`)).ok) missingStyles.push(href);
					}
					const missingGlobals = globals.filter((path) => {
						const value = path
							.split('.')
							.reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], window);
						return typeof value !== 'function';
					});
					return { missingStyles, missingGlobals };
				},
				{ scripts, styles, globals: libraries.map((lib) => lib.global) }
			);

			expect(result).toStrictEqual({ missingStyles: [], missingGlobals: [] });
			expect(errors).toStrictEqual([]);
		});

		if (features.libraries.includes('compare')) {
			test('compare and geocoder plugins work with a style of versatiles-style', async ({ page, serverUrl }) => {
				const guard = await HostGuard.install(page, serverUrl);
				const errors: string[] = [];
				page.on('pageerror', (err) => errors.push(err.message));

				await page.goto(`${serverUrl}/robots.txt`);
				await page.setContent(`<!doctype html>
					<link rel="stylesheet" href="${serverUrl}/assets/lib/maplibre-gl/maplibre-gl.css" />
					<link rel="stylesheet" href="${serverUrl}/assets/lib/maplibre-gl-compare/maplibre-gl-compare.css" />
					<link rel="stylesheet" href="${serverUrl}/assets/lib/maplibre-gl-geocoder/maplibre-gl-geocoder.css" />
					<script src="${serverUrl}/assets/lib/maplibre-gl/maplibre-gl.js"></script>
					<script src="${serverUrl}/assets/lib/maplibre-gl-compare/maplibre-gl-compare.js"></script>
					<script src="${serverUrl}/assets/lib/maplibre-gl-geocoder/maplibre-gl-geocoder.js"></script>
					<script src="${serverUrl}/assets/lib/versatiles-style/versatiles-style.js"></script>
					<div id="container" style="position: relative; width: 800px; height: 600px">
						<div id="before" style="position: absolute; inset: 0"></div>
						<div id="after" style="position: absolute; inset: 0"></div>
					</div>`);

				const createMaps = page.evaluate(async (base) => {
					const w = window as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
					const ml = w.maplibregl;
					// inlineSources resolves the relative tile URLs of the TileJSON of this server.
					const createMap = async (container: string, theme: string) => {
						const style = await w.VersaTilesStyle.inlineSources(w.VersaTilesStyle.osm({ theme, urls: { base } }));
						return new Promise((resolve) => {
							const map = new ml.Map({ container, style, center: [13.4, 52.5], zoom: 10 });
							map.once('idle', () => resolve(map));
						});
					};
					const before = await createMap('before', 'colorful');
					const after = await createMap('after', 'gray-dark');
					new ml.Compare(before, after, '#container');

					const geocoderApi = { forwardGeocode: async () => ({ type: 'FeatureCollection', features: [] }) };
					(before as { addControl(control: unknown): void }).addControl(
						new w.MaplibreGeocoder(geocoderApi, { maplibregl: ml })
					);
				}, serverUrl);
				await guard.until(createMaps);

				await expect(page.locator('.maplibregl-compare .compare-swiper-vertical')).toBeVisible();
				await expect(page.locator('.maplibregl-ctrl-geocoder input')).toBeVisible();
				guard.expectOnlyThisHost(['/tiles/osm/', '/assets/glyphs/', '/assets/sprites/']);
				expect(errors).toStrictEqual([]);
			});
		}
	});
}
