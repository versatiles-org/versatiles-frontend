import { test, expect, SCREENSHOT_LOCATION } from './fixtures.js';
import type { Page } from '@playwright/test';

test.use({ bundleName: 'frontend' });

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
		(window as unknown as Record<string, unknown>).__mapIdle = new Promise<void>((r) => (resolve = r));
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
	await page.evaluate(() => (window as unknown as Record<string, unknown>).__mapIdle);
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

test('GeolocateControl is visible', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.locator('.maplibregl-ctrl-geolocate')).toBeVisible();
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

test('MaplibreInspect control is present', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.locator('.maplibregl-ctrl-inspect')).toBeAttached();
});

test('location search (geocoder) control is present', async ({ page, serverUrl }) => {
	await page.goto(serverUrl);
	await waitForMapReady(page);
	await expect(page.locator('.versatiles-geocoder-input')).toBeAttached();
});

/** Two results: the first carries an extent, the second only a point. */
const GEOCODER_RESPONSE = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [13.3951309, 52.5173885] },
			properties: {
				name: 'Berlin',
				type: 'city',
				country: 'Germany',
				// Photon order: [west, north, east, south]
				extent: [13.088345, 52.6755087, 13.7611609, 52.3382448],
			},
		},
		{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [-71.1810703, 44.4696602] },
			properties: { name: 'Berlin', type: 'city', state: 'New Hampshire', country: 'United States' },
		},
	],
};

/**
 * Answers the geocoding backend from a fixture and records the requests, so the tests do
 * not depend on the live service.
 */
async function stubGeocoder(page: Page, body: unknown = GEOCODER_RESPONSE): Promise<string[]> {
	const requests: string[] = [];
	await page.route('**/geocode.versatiles.org/**', async (route) => {
		requests.push(route.request().url());
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
	});
	return requests;
}

/** Reads the current camera, rounded, from the map exposed by {@link exposeMap}. */
async function readCamera(page: Page): Promise<{ lng: number; lat: number; zoom: number }> {
	return page.evaluate(() => {
		const map = (window as unknown as { __map: { getCenter(): { lng: number; lat: number }; getZoom(): number } })
			.__map;
		const center = map.getCenter();
		return { lng: Math.round(center.lng), lat: Math.round(center.lat), zoom: Math.round(map.getZoom()) };
	});
}

/** Exposes the map instance as window.__map. Must be called before page.goto(). */
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

test('search lists results while typing', async ({ page, serverUrl }) => {
	await stubGeocoder(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);

	await page.locator('.versatiles-geocoder-input').fill('Berlin');

	await expect(page.locator('.versatiles-geocoder-result')).toHaveCount(2);
	await expect(page.locator('.versatiles-geocoder-result').first()).toContainText('Berlin');
	await expect(page.locator('.versatiles-geocoder-result').nth(1)).toContainText('New Hampshire');
});

test('search sends the query and biases towards the map center', async ({ page, serverUrl }) => {
	const requests = await stubGeocoder(page);
	await exposeMap(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);

	await page.locator('.versatiles-geocoder-input').fill('Berlin');
	await expect(page.locator('.versatiles-geocoder-result').first()).toBeVisible();

	const url = new URL(requests[requests.length - 1]);
	expect(url.searchParams.get('q')).toBe('Berlin');

	// The bias has to be the current map center, not merely present: a missing parameter
	// would otherwise read as 0 and still look like a plausible coordinate.
	const camera = await readCamera(page);
	expect(url.searchParams.has('lat')).toBe(true);
	expect(url.searchParams.has('lon')).toBe(true);
	expect(Math.round(Number(url.searchParams.get('lat')))).toBe(camera.lat);
	expect(Math.round(Number(url.searchParams.get('lon')))).toBe(camera.lng);
});

test('enter picks the first result, closes the list and moves the map', async ({ page, serverUrl }) => {
	await stubGeocoder(page);
	await exposeMap(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);

	await page.locator('.versatiles-geocoder-input').fill('Berlin');
	await expect(page.locator('.versatiles-geocoder-result').first()).toBeVisible();
	await page.locator('.versatiles-geocoder-input').press('Enter');

	// The list closes on Enter, and the chosen result becomes the field's value.
	await expect(page.locator('.versatiles-geocoder-results')).toBeHidden();
	await expect(page.locator('.versatiles-geocoder-input')).toHaveValue('Berlin');

	// The first result carries an extent, so the camera is fitted to it. Asserting the
	// settled values (including zoom) matters: the camera animates, and a value it merely
	// passes through on the way would make this pass for the wrong reason.
	await expect.poll(async () => readCamera(page)).toStrictEqual({ lng: 13, lat: 53, zoom: 10 });
});

test('a result without an extent falls back to a zoom for its type', async ({ page, serverUrl }) => {
	await stubGeocoder(page);
	await exposeMap(page);
	await page.goto(serverUrl);
	await waitForMapReady(page);

	await page.locator('.versatiles-geocoder-input').fill('Berlin');
	// The second result is a point with no extent, so ZOOM_BY_TYPE.city applies.
	await page.locator('.versatiles-geocoder-result').nth(1).click();

	await expect.poll(async () => readCamera(page)).toStrictEqual({ lng: -71, lat: 44, zoom: 11 });
});

test('search reports when there are no results', async ({ page, serverUrl }) => {
	await stubGeocoder(page, { type: 'FeatureCollection', features: [] });
	await page.goto(serverUrl);
	await waitForMapReady(page);

	await page.locator('.versatiles-geocoder-input').fill('Berlin');

	await expect(page.locator('.versatiles-geocoder-message')).toHaveText('No results');
});

test('screenshot', async ({ page, serverUrl }) => {
	await installMapIdleHook(page);
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.goto(`${serverUrl}/#map=${SCREENSHOT_LOCATION}&style=colorful`);
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
