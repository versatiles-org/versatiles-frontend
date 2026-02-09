import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

test.use({ bundleName: 'frontend' });

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

test('page loads without console errors', async ({ page, serverUrl }) => {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(err.message));
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	expect(errors).toStrictEqual([]);
});

test('title is "VersaTiles"', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await expect(page).toHaveTitle('VersaTiles');
});

test('#map div exists and contains a canvas', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	const map = page.locator('#map');
	await expect(map).toBeVisible();
	await expect(map.locator('canvas')).toBeAttached();
});

test('NavigationControl is visible', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.locator('.maplibregl-ctrl-zoom-in')).toBeVisible();
});

test('VersaTiles logo loads', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	const logo = page.locator('img[alt="VersaTiles"]');
	await expect(logo).toBeVisible();
	const width = await logo.evaluate((el) => (el as unknown as { naturalWidth: number }).naturalWidth);
	expect(width).toBeGreaterThan(0);
});

test('VersaTilesStylerControl is present', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.getByRole('button', { name: 'Toggle style editor' })).toBeAttached();
});

test('MaplibreInspect control is present', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.locator('.maplibregl-ctrl-inspect')).toBeAttached();
});

test('no 404 errors for assets', async ({ page, serverUrl }) => {
	const notFound: string[] = [];
	page.on('response', (res) => {
		if (res.status() === 404 && res.url().startsWith(serverUrl)) {
			notFound.push(res.url());
		}
	});
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await page.waitForLoadState('networkidle');
	expect(notFound).toStrictEqual([]);
});
