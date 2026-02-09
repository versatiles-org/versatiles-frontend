import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

test.use({
	bundleName: 'frontend-dev',
	tileIndex: ['osm', 'hillshade'],
	tilesMeta: {
		osm: {
			name: 'OpenStreetMap',
			description: 'OSM vector tiles',
			type: 'vector',
			format: 'pbf',
			minzoom: 0,
			maxzoom: 14,
		},
		hillshade: {
			name: 'Hillshade',
			description: 'Terrain hillshading',
			type: 'raster',
			format: 'webp',
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
 * Intercept maplibregl.Map to expose the instance on window.__mapInstance.
 * Must be called before page.goto().
 */
async function installMapHook(page: Page) {
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
						(window as Record<string, unknown>).__mapInstance = instance;
						return instance;
					};
					(val.Map as Record<string, unknown>).prototype = OrigMap.prototype;
					Object.setPrototypeOf(val.Map, OrigMap);
				}
			},
		});
	});
}

/**
 * Navigate the map to a specific position and wait for rendering to complete.
 * Uses jumpTo + debounced idle event to ensure tiles are fully rendered.
 */
async function navigateMapAndWait(page: Page, options: { center: [number, number]; zoom: number }) {
	await page.evaluate(({ center, zoom }) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const map = (window as any).__mapInstance;
		return new Promise<void>((resolve) => {
			let timer: ReturnType<typeof setTimeout>;
			map.on('idle', () => {
				clearTimeout(timer);
				timer = setTimeout(resolve, 500);
			});
			map.jumpTo({ center, zoom });
		});
	}, options);
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
		await expect(page.locator('#list .box h2').first()).toHaveText('OpenStreetMap');
		await expect(page.locator('#list .box h2').nth(1)).toHaveText('Hillshade');
	});

	test('screenshot', async ({ page, serverUrl }) => {
		await page.setViewportSize({ width: 640, height: 480 });
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
		await page.goto(`${serverUrl}/preview.html?id=test`);
		await expect(page).toHaveTitle('VersaTiles - Preview');
	});

	test('#map with canvas', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=test`);
		await waitForMapReady(page);
		const map = page.locator('#map');
		await expect(map).toBeVisible();
		await expect(map.locator('canvas')).toBeAttached();
	});

	test('styler and inspect controls present', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=test`);
		await waitForMapReady(page);
		await expect(page.getByRole('button', { name: 'Toggle style editor' })).toBeAttached();
		await expect(page.getByRole('button', { name: 'Toggle Inspect' })).toBeAttached();
	});

	test('logo is present', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await page.goto(`${serverUrl}/preview.html?id=test`);
		const logo = page.locator('img[alt="VersaTiles"]');
		await expect(logo).toBeVisible();
	});

	test('screenshot', async ({ page, serverUrl }) => {
		await mockBrowserRequests(page);
		await installMapHook(page);
		await page.setViewportSize({ width: 640, height: 480 });
		await page.goto(`${serverUrl}/preview.html?id=osm`);
		await waitForMapReady(page);
		await page.waitForLoadState('networkidle');
		await navigateMapAndWait(page, { center: [13.4, 52.474], zoom: 13 });
		await page.waitForLoadState('networkidle');
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
