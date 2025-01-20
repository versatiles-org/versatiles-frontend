import { jest } from '@jest/globals';

// Mock progress
const { mockProgress } = await import('../utils/__mocks__/progress');
jest.unstable_mockModule('../utils/progress', () => mockProgress);
await import('../utils/progress');

const PromiseFunction = (await import('../utils/async')).default;

// Mock curl
const { mockCurl } = await import('../utils/__mocks__/curl');
jest.unstable_mockModule('../utils/curl', () => mockCurl);
const { Curl } = await import('../utils/curl');

const { FileSystem } = await import('../filesystem/file_system');

// Mock utils
const { mockUtils } = await import('../utils/__mocks__/utils');
jest.unstable_mockModule('../utils/utils', () => mockUtils);

// Mock release_version
const { mockReleaseVersion } = await import('../utils/__mocks__/release_version');
jest.unstable_mockModule('../utils/release_version', () => mockReleaseVersion);
const { getLatestReleaseVersion } = await import('../utils/release_version');


const { loadAssets: getAssets } = await import('./assets');



describe('getAssets', () => {
	it('successfully downloads and processes assets', async () => {
		const mockFileSystem = new FileSystem();

		await expect(PromiseFunction.run(getAssets(mockFileSystem))).resolves.toBeUndefined();

		// test if correct release versions were requestes
		const glrvCalls = jest.mocked(getLatestReleaseVersion).mock.calls;
		glrvCalls.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
		expect(glrvCalls).toStrictEqual([
			['maplibre', 'maplibre-gl-js'],
			['versatiles-org', 'versatiles-fonts'],
			['versatiles-org', 'versatiles-style', true],
		]);

		// test if correct releases were downloaded
		const curlResults = jest.mocked(Curl).mock.results.map(e => (e.value as { url: string }).url);
		curlResults.sort();
		expect(curlResults).toStrictEqual([
			'https://github.com/maplibre/maplibre-gl-js/releases/download/v1.2.3/dist.zip',
			'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/fonts.tar.gz',
			'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/sprites.tar.gz',
			'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/styles.tar.gz',
			'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/versatiles-style.tar.gz',
			'https://unpkg.com/@maplibre/maplibre-gl-inspect@latest/dist/maplibre-gl-inspect.css',
			'https://unpkg.com/@maplibre/maplibre-gl-inspect@latest/dist/maplibre-gl-inspect.js',
		]);
	});
});
