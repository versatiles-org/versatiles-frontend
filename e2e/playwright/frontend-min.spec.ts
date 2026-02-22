import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

test.use({ bundleName: 'frontend-min' });

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

test('page loads without console errors', async ({ page, serverUrl }) => {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(err.message));
	await page.goto(serverUrl);
	await waitForMapReady(page);
	expect(errors).toStrictEqual([]);
});

test('title is "VersaTiles"', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await expect(page).toHaveTitle('VersaTiles');
});

test('#map div exists and contains a canvas', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await waitForMapReady(page);
	const map = page.locator('#map');
	await expect(map).toBeVisible();
	await expect(map.locator('canvas')).toBeAttached();
});

test('NavigationControl is visible', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.locator('.maplibregl-ctrl-zoom-in')).toBeVisible();
});

test('VersaTiles logo loads', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	const logo = page.locator('img[alt="VersaTiles"]');
	await expect(logo).toBeVisible();
	const width = await logo.evaluate((el) => (el as unknown as { naturalWidth: number }).naturalWidth);
	expect(width).toBeGreaterThan(0);
});

test('VersaTilesStylerControl is present', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.getByRole('button', { name: 'Toggle style editor' })).toBeAttached();
});

test('screenshot', async ({ page, serverUrl }) => {
	await installMapIdleHook(page);
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.goto(`${serverUrl}/#map=13/52.474/13.40&style=satellite`);
	await waitForMapRendered(page);
	await expect(page).toHaveScreenshot();
});

test('no 404 errors for assets', async ({ page, serverUrl }) => {
	const notFound: string[] = [];
	page.on('response', (res) => {
		if (res.status() === 404 && res.url().startsWith(serverUrl)) {
			notFound.push(res.url());
		}
	});
	await page.goto(serverUrl);
	await page.waitForLoadState('networkidle');
	expect(notFound).toStrictEqual([]);
});
