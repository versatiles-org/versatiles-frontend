/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';

await import('./__mocks__/progress.js');
const { default: PromiseFunction } = await import('./async.js');
const { Curl } = await import('./__mocks__/curl.js');
const { FileSystem } = await import('./file_system.js');
const { getLatestReleaseVersion } = await import('./__mocks__/utils.js');
const { getAssets } = await import('./assets.js');


describe('getAssets', () => {
	it('successfully downloads and processes assets', async () => {
		const mockFileSystem = new FileSystem();

		await expect(PromiseFunction.run(getAssets(mockFileSystem))).resolves.toBeUndefined();

		const glrvCalls = jest.mocked(getLatestReleaseVersion).mock.calls;
		glrvCalls.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
		expect(glrvCalls).toStrictEqual([
			['acalcutt', 'maplibre-gl-inspect'],
			['maplibre', 'maplibre-gl-js'],
			['versatiles-org', 'versatiles-fonts'],
			['versatiles-org', 'versatiles-style'],
		]);

		const curlResults = jest.mocked(Curl).mock.results.map(e => (e.value as { url: string }).url);
		curlResults.sort();
		expect(curlResults).toStrictEqual([
			'https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.2.3/maplibre-gl-inspect.css',
			'https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.2.3/maplibre-gl-inspect.min.js',
			'https://github.com/maplibre/maplibre-gl-js/releases/download/v1.2.3/dist.zip',
			'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/fonts.tar.gz',
			'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/sprites.tar.gz',
			'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/styles.tar.gz',
			'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/versatiles-style.tar.gz',
		]);
	});
});
