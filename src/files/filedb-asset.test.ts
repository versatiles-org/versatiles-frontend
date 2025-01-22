import { jest } from '@jest/globals';

// Mock progress
await import('../utils/__mocks__/progress');
const { Curl } = await import('../utils/__mocks__/curl');
const { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } = await import('../utils/__mocks__/release_version');
const { AssetFileDB } = await import('./filedb-asset');



describe('getAssets', () => {
	function getGHCalls() {
		const calls = getLatestGithubReleaseVersion.mock.calls;
		calls.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
		return calls;
	}

	function getNPMCalls() {
		const calls = getLatestNPMReleaseVersion.mock.calls.map(e => e[0]);
		calls.sort((a, b) => a.localeCompare(b));
		return calls;
	}

	function getCurlCalls() {
		const calls = Curl.mock.calls.map(e => e[1]);
		calls.sort((a, b) => a.localeCompare(b));
		return calls;
	}

	describe('successfully downloads and processes assets', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		})

		it('fonts', async () => {
			await AssetFileDB.build({ type: 'asset', source: 'fonts' });
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts']]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/fonts.tar.gz'
			]);
		});

		it('styles', async () => {
			await AssetFileDB.build({ type: 'asset', source: 'styles' });
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-style', true]]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/sprites.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/styles.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/versatiles-style.tar.gz',
			]);
		});

		it('maplibre', async () => {
			await AssetFileDB.build({ type: 'asset', source: 'maplibre' });
			expect(getGHCalls()).toStrictEqual([['maplibre', 'maplibre-gl-js']]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/maplibre/maplibre-gl-js/releases/download/v1.2.3/dist.zip'
			]);
		});

		it('maplibre-inspect', async () => {
			await AssetFileDB.build({ type: 'asset', source: 'maplibre-inspect' });
			expect(getNPMCalls()).toStrictEqual(['@maplibre/maplibre-gl-inspect']);
			expect(getCurlCalls()).toStrictEqual([
				'https://registry.npmjs.org/@maplibre/maplibre-gl-inspect/-/maplibre-gl-inspect-2.3.4.tgz'
			]);
		});
	})
});
