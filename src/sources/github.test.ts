import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { MapName, OnFile } from './archive';
import type { GithubSourceConfig } from './source-config';

// Mock the archive module. vi.hoisted makes archiveCalls and mapNames available to the hoisted mock.
const { archiveCalls, mapNames } = vi.hoisted(() => {
	return {
		archiveCalls: [] as string[],
		mapNames: {
			ungzipUntar: null as MapName | null,
			unzstdUntar: null as MapName | null,
			unzip: null as MapName | null,
		},
	};
});

vi.mock('./archive', () => {
	// Records the name mapper, and extracts one file, fonts.json, through it.
	function extract(method: keyof typeof mapNames) {
		return vi.fn(async (mapName: MapName, onFile: OnFile) => {
			mapNames[method] = mapName;
			const path = mapName('fonts.json');
			if (path !== false) onFile(path, Buffer.from('mocked content'));
		});
	}

	class Archive {
		ungzipUntar = extract('ungzipUntar');
		unzstdUntar = extract('unzstdUntar');
		unzip = extract('unzip');
		getBuffer = vi.fn(async () => Buffer.from('mocked buffer'));

		constructor(url: string) {
			archiveCalls.push(url);
		}
	}

	return { Archive };
});

// Mock release-version module
vi.mock('./github-release', () => ({
	getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(
		async () => '1.2.3'
	),
}));

import { GithubFileDB } from './github';
import { getLatestGithubReleaseVersion } from './github-release';

// Source configs for tests
const fontsAllConfig: GithubSourceConfig = {
	type: 'github',
	version: { github: 'versatiles-org/versatiles-fonts' },
	assets: [
		{
			url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/fonts.tar.gz',
			format: 'tar.gz',
			dest: 'assets/glyphs/',
			rename: { 'fonts.json': 'index.json' },
		},
	],
	source: { name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' },
};

const fontsNotoConfig: GithubSourceConfig = {
	type: 'github',
	version: { github: 'versatiles-org/versatiles-fonts' },
	assets: [
		{
			url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/noto_sans.tar.gz',
			format: 'tar.gz',
			dest: 'assets/glyphs/',
			rename: { 'fonts.json': 'index.json' },
		},
	],
	source: { name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' },
};

const stylesConfig: GithubSourceConfig = {
	type: 'github',
	version: { github: 'versatiles-org/versatiles-style', prerelease: true },
	assets: [
		{
			url: 'https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/styles.tar.gz',
			format: 'tar.gz',
			dest: 'assets/styles/',
		},
		{
			url: 'https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/versatiles-style.tar.gz',
			format: 'tar.gz',
			dest: 'assets/lib/versatiles-style/',
		},
		{
			url: 'https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz',
			format: 'tar.gz',
			dest: 'assets/sprites/',
		},
	],
	source: { name: 'VersaTiles Style', url: 'https://github.com/versatiles-org/versatiles-style' },
};

describe('getAssets', () => {
	function getGHCalls() {
		const calls = vi.mocked(getLatestGithubReleaseVersion).mock.calls;
		calls.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
		return calls;
	}

	function getArchiveCalls() {
		const calls = [...archiveCalls];
		calls.sort((a, b) => a.localeCompare(b));
		return calls;
	}

	describe('successfully downloads and processes assets', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			archiveCalls.length = 0;
		});

		it('fonts', async () => {
			await GithubFileDB.build(fontsAllConfig);
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts', undefined]]);
			expect(getArchiveCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/fonts.tar.gz',
			]);
		});

		it('styles', async () => {
			await GithubFileDB.build(stylesConfig);
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-style', true]]);
			expect(getArchiveCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/sprites.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/styles.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/versatiles-style.tar.gz',
			]);
		});

		it('fonts-noto', async () => {
			await GithubFileDB.build(fontsNotoConfig);
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts', undefined]]);
			expect(getArchiveCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/noto_sans.tar.gz',
			]);
		});
	});

	describe('pinned versions', () => {
		const pinnedConfig = (pin: string): GithubSourceConfig => ({
			type: 'github',
			version: { github: 'versatiles-org/versatiles-fonts', pin },
			assets: [
				{
					url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/fonts.tar.gz',
					format: 'tar.gz',
					dest: 'assets/glyphs/',
				},
			],
		});

		beforeEach(() => {
			vi.clearAllMocks();
			archiveCalls.length = 0;
		});

		it('downloads the pinned version instead of the latest one', async () => {
			// The mocked backend reports 1.2.3 as the latest release.
			await GithubFileDB.build(pinnedConfig('1.0.0'));

			expect(archiveCalls).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.0.0/fonts.tar.gz',
			]);
		});

		it('warns when a newer release than the pin exists', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			await GithubFileDB.build(pinnedConfig('1.0.0'));

			expect(warn).toHaveBeenCalledWith('Warning: versatiles-fonts 1.2.3 available (pinned to 1.0.0)');
		});

		it('stays quiet when the pin is already the latest release', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			await GithubFileDB.build(pinnedConfig('1.2.3'));

			expect(warn).not.toHaveBeenCalled();
		});

		it('still builds when the update check fails', async () => {
			// The point of a pin: a rate-limited or unreachable GitHub API must not fail the build.
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			vi.mocked(getLatestGithubReleaseVersion).mockRejectedValueOnce(Error('GitHub API rate limit exceeded'));

			await GithubFileDB.build(pinnedConfig('1.0.0'));

			expect(archiveCalls).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.0.0/fonts.tar.gz',
			]);
			expect(warn).toHaveBeenCalledWith(
				'Warning: could not check for versatiles-fonts updates (pinned to 1.0.0): GitHub API rate limit exceeded'
			);
		});

		it('fails when the version is not pinned and the lookup fails', async () => {
			// Without a pin there is no version to fall back to, so the error must propagate.
			vi.mocked(getLatestGithubReleaseVersion).mockRejectedValueOnce(Error('GitHub API rate limit exceeded'));

			await expect(GithubFileDB.build(fontsAllConfig)).rejects.toThrow('GitHub API rate limit exceeded');
		});
	});

	describe('name mapping', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			archiveCalls.length = 0;
			mapNames.ungzipUntar = null;
			mapNames.unzstdUntar = null;
			mapNames.unzip = null;
		});

		it('extracts tar.zst assets with unzstdUntar', async () => {
			await GithubFileDB.build({
				...fontsAllConfig,
				assets: [{ ...fontsAllConfig.assets[0], format: 'tar.zst' }],
			});
			expect(mapNames.ungzipUntar).toBeNull();
			expect(mapNames.unzstdUntar?.('fonts.json')).toBe('assets/glyphs/index.json');
		});

		it('stores the extracted files in the database', async () => {
			const db = await GithubFileDB.build(fontsAllConfig);
			expect(db.getFile('assets/glyphs/index.json')?.toString()).toBe('mocked content');
		});

		it('fonts filter renames fonts.json to index.json', async () => {
			await GithubFileDB.build(fontsAllConfig);
			expect(mapNames.ungzipUntar).toBeTruthy();
			if (mapNames.ungzipUntar) {
				expect(mapNames.ungzipUntar('fonts.json')).toBe('assets/glyphs/index.json');
				expect(mapNames.ungzipUntar('other.json')).toBe('assets/glyphs/other.json');
			}
		});
	});
});
