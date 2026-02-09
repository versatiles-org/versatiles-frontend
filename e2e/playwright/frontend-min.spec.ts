import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

test.use({ bundleName: 'frontend-min' });

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

test('no styler control present', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.getByRole('button', { name: 'Toggle style editor' })).toHaveCount(0);
});

test('no inspect control present', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.getByRole('button', { name: 'Toggle Inspect' })).toHaveCount(0);
});

test('screenshot', async ({ page, serverUrl }) => {
	await mockBrowserRequests(page);
	await installMapHook(page);
	await page.setViewportSize({ width: 640, height: 480 });
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await page.waitForLoadState('networkidle');
	await navigateMapAndWait(page, { center: [13.4, 52.474], zoom: 13 });
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveScreenshot();
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
