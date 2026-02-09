import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

test.use({
	bundleName: 'frontend-dev',
	tileIndex: ['osm', 'hillshade'],
	tilesMeta: {
		osm: {
			tilejson: '3.0.0',
			name: 'VersaTiles OSM',
			description: 'Vector tiles based on OSM in Shortbread scheme',
			type: 'baselayer',
			tile_format: 'vnd.mapbox-vector-tile',
			tile_schema: 'shortbread@1.0',
			tiles: ['/tiles/osm/{z}/{x}/{y}'],
			bounds: [-180, -85.051129, 180, 85.051129],
			minzoom: 0,
			maxzoom: 14,
			vector_layers: [
				{ id: 'addresses', minzoom: 14, maxzoom: 14, fields: {} },
				{ id: 'aerialways', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'boundaries', minzoom: 0, maxzoom: 14, fields: {} },
				{ id: 'boundary_labels', minzoom: 2, maxzoom: 14, fields: {} },
				{ id: 'bridges', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'buildings', minzoom: 14, maxzoom: 14, fields: {} },
				{ id: 'dam_lines', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'dam_polygons', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'ferries', minzoom: 8, maxzoom: 14, fields: {} },
				{ id: 'land', minzoom: 10, maxzoom: 14, fields: {} },
				{ id: 'ocean', minzoom: 8, maxzoom: 14, fields: {} },
				{ id: 'pier_lines', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'pier_polygons', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'place_labels', minzoom: 3, maxzoom: 14, fields: {} },
				{ id: 'pois', minzoom: 14, maxzoom: 14, fields: {} },
				{ id: 'public_transport', minzoom: 11, maxzoom: 14, fields: {} },
				{ id: 'sites', minzoom: 14, maxzoom: 14, fields: {} },
				{ id: 'street_labels', minzoom: 10, maxzoom: 14, fields: {} },
				{ id: 'street_labels_points', minzoom: 12, maxzoom: 14, fields: {} },
				{ id: 'street_polygons', minzoom: 11, maxzoom: 14, fields: {} },
				{ id: 'streets', minzoom: 14, maxzoom: 14, fields: {} },
				{ id: 'streets_polygons_labels', minzoom: 14, maxzoom: 14, fields: {} },
				{ id: 'water_lines', minzoom: 4, maxzoom: 14, fields: {} },
				{ id: 'water_lines_labels', minzoom: 4, maxzoom: 14, fields: {} },
				{ id: 'water_polygons', minzoom: 4, maxzoom: 14, fields: {} },
				{ id: 'water_polygons_labels', minzoom: 14, maxzoom: 14, fields: {} },
			],
		},
		hillshade: {
			tilejson: '3.0.0',
			name: 'Hillshade',
			description: 'Terrain hillshading',
			type: 'raster',
			tile_format: 'webp',
			tiles: ['/tiles/hillshade/{z}/{x}/{y}'],
			bounds: [-180, -85.051129, 180, 85.051129],
			minzoom: 0,
			maxzoom: 12,
		},
	},
});

/** Intercept RTL plugin (loads WASM, unnecessary for tests). */
async function mockBrowserRequests(page: Page) {
	await page.route('**/mapbox-gl-rtl-text.js', (route) =>
		route.fulfill({ status: 200, contentType: 'application/javascript', body: '// mocked' })
	);
}

/** Wait for the MapLibre map canvas to appear (indicates map has initialized). */
async function waitForMapReady(page: Page) {
	await page.locator('.maplibregl-canvas').waitFor({ state: 'attached', timeout: 20_000 });
}

/**
 * Intercept maplibregl.Map to resolve window.__mapIdle on debounced idle.
 * Must be called before page.goto().
 */
async function installMapIdleHook(page: Page) {
	await page.addInitScript(() => {
		let resolve: () => void;
		(window as Record<string, unknown>).__mapIdle = new Promise<void>((r) => (resolve = r));
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
					const OrigMap = val.Map as new (...args: unknown[]) => Record<string, unknown>;
					val.Map = function (...args: unknown[]) {
						const instance = new OrigMap(...args);
						let timer: ReturnType<typeof setTimeout>;
						(instance.on as (event: string, fn: () => void) => void)('idle', () => {
							clearTimeout(timer);
							timer = setTimeout(() => resolve(), 500);
						});
						return instance;
					};
					(val.Map as Record<string, unknown>).prototype = OrigMap.prototype;
					Object.setPrototypeOf(val.Map, OrigMap);
				}
			},
		});
	});
}

/** Wait for map tiles to be fully rendered. */
async function waitForMapRendered(page: Page) {
	await waitForMapReady(page);
	await page.waitForLoadState('networkidle');
	await page.evaluate(() => (window as Record<string, unknown>).__mapIdle);
}

// --- Overview page tests ---

test.describe('overview page', () => {
	test('title is "VersaTiles - Overview"', async ({ page, serverUrl }) => {
		await page.goto(serverUrl);
		await expect(page).toHaveTitle('VersaTiles - Overview');
	});

	test('logo is visible', async ({ page, serverUrl }) => {
		await page.goto(serverUrl);
		const logo = page.locator('h1 img');
		await expect(logo).toBeVisible();
	});

	test('tile sources are listed', async ({ page, serverUrl }) => {
		await page.goto(serverUrl);
		await expect(page.locator('#list .box')).toHaveCount(2);
	});

	test('boxes show metadata from mocked tiles.json', async ({ page, serverUrl }) => {
		await page.goto(serverUrl);
		await expect(page.locator('#list .box')).toHaveCount(2);
		await expect(page.locator('#list .box h2').first()).toHaveText('VersaTiles OSM');
		await expect(page.locator('#list .box h2').nth(1)).toHaveText('Hillshade');
	});

	test('screenshot', async ({ page, serverUrl }) => {
		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto(serverUrl);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveScreenshot();
	});

	test('boxes link to preview.html with correct id', async ({ page, serverUrl }) => {
		await page.goto(serverUrl);
		await expect(page.locator('#list .box')).toHaveCount(2);
		const links = page.locator('#list a.box');
		await expect(links.first()).toHaveAttribute('href', 'preview.html?id=osm');
		await expect(links.nth(1)).toHaveAttribute('href', 'preview.html?id=hillshade');
	});
});

// --- Preview page tests ---

test.describe('preview page', () => {
	test('title is "VersaTiles - Preview"', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=osm`);
		await expect(page).toHaveTitle('VersaTiles - Preview');
	});

	test('#map with canvas', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=osm`);
		await waitForMapReady(page);
		const map = page.locator('#map');
		await expect(map).toBeVisible();
		await expect(map.locator('canvas')).toBeAttached();
	});

	test('inspect control present', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=osm`);
		await waitForMapReady(page);
		await expect(page.getByRole('button', { name: 'Toggle Inspect' })).toBeAttached();
	});

	test('logo is present', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=osm`);
		const logo = page.locator('img[alt="VersaTiles"]');
		await expect(logo).toBeVisible();
	});

	test('screenshot', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await installMapIdleHook(page);
		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto(`${serverUrl}/preview.html?id=osm`);
		await waitForMapRendered(page);
		await expect(page).toHaveScreenshot();
	});
});

// --- Preview page error handling ---

test.describe('preview page without id', () => {
	test('throws error when id is missing', async ({ page, serverUrl }) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html`);
		await page.waitForLoadState('networkidle');
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some((e) => e.includes('id is not defined'))).toBe(true);
	});
});
