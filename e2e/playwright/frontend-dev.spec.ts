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
