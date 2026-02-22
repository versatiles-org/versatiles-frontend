import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from '../async_progress/progress';
import type { Curl as CurlType } from '../utils/curl';
import type { ExternalSourceConfig } from './source_config';

// Mock curl module - use vi.hoisted to ensure curlCalls is available when the mock is executed
const { curlCalls, filterCallbacks } = vi.hoisted(() => {
	return {
		curlCalls: [] as string[],
		filterCallbacks: {
			ungzipUntar: null as ((filename: string) => string | false) | null,
			unzip: null as ((filename: string) => string | false) | null,
		},
	};
});

vi.mock('../utils/curl', () => {
	type CurlInstance = CurlType;

	class Curl {
		url: string;
		fileDB: unknown;
		ungzipUntar: CurlInstance['ungzipUntar'];
		save: CurlInstance['save'];
		unzip: CurlInstance['unzip'];
		getBuffer: CurlInstance['getBuffer'];

		constructor(fileDB: unknown, url: string) {
			this.fileDB = fileDB;
			this.url = url;
			curlCalls.push(url);

			this.ungzipUntar = vi.fn(async (filter) => {
				// Capture the filter callback for testing
				filterCallbacks.ungzipUntar = filter;
			}) as CurlInstance['ungzipUntar'];

			this.save = vi.fn(async () => {
				// no-op in tests
			}) as CurlInstance['save'];

			this.unzip = vi.fn(async (filter) => {
				// Capture the filter callback for testing
				filterCallbacks.unzip = filter;
			}) as CurlInstance['unzip'];

			this.getBuffer = vi.fn(async () => Buffer.from('mocked buffer')) as CurlInstance['getBuffer'];
		}
	}

	return {
		Curl,
		curlCalls,
		default: Curl,
	};
});

// Mock progress module
vi.mock('../async_progress/progress', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('../async_progress/progress');
	originalModule.default.disable();

	function mockProgressLabel(progressLabel: ProgressLabelType) {
		vi.spyOn(progressLabel, 'updateLabel');
		vi.spyOn(progressLabel, 'start');
		vi.spyOn(progressLabel, 'end');
		vi.spyOn(progressLabel, 'getOutputAnsi');
		vi.spyOn(progressLabel, 'getOutputText');
	}

	class ProgressLabel extends originalModule.ProgressLabel {
		constructor(progress: ProgressType, label: string, indent: number) {
			super(progress, label, indent);
			mockProgressLabel(this);
		}
	}

	class Progress extends originalModule.Progress {
		constructor() {
			super();

			// Wrap the original add method so we can spy on the returned ProgressLabel as well
			const originalAdd = this.add.bind(this);
			this.add = ((name: string, indent = 0): ProgressLabelType => {
				const progressLabel = originalAdd(name, indent);
				mockProgressLabel(progressLabel);
				return progressLabel;
			}) as ProgressType['add'];
		}
	}

	const progress = new Progress();
	vi.spyOn(progress, 'add');
	vi.spyOn(progress, 'disable');
	vi.spyOn(progress, 'finish');
	vi.spyOn(progress, 'redraw');
	vi.spyOn(progress, 'setAnsi');
	vi.spyOn(progress, 'setHeader');
	vi.spyOn(progress, 'write');

	return {
		Progress: vi.fn(function () {
			return progress;
		}),
		default: progress,
		ProgressLabel,
	};
});

// Mock release_version module
vi.mock('../utils/release_version', () => ({
	getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(
		async () => '1.2.3'
	),
}));

import { ExternalFileDB } from './filedb-external';
import { getLatestGithubReleaseVersion } from '../utils/release_version';

// Source configs for tests
const fontsAllConfig: ExternalSourceConfig = {
	type: 'external',
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

const fontsNotoConfig: ExternalSourceConfig = {
	type: 'external',
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

const stylesConfig: ExternalSourceConfig = {
	type: 'external',
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

	function getCurlCalls() {
		const calls = [...curlCalls];
		calls.sort((a, b) => a.localeCompare(b));
		return calls;
	}

	describe('successfully downloads and processes assets', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			curlCalls.length = 0;
		});

		it('fonts', async () => {
			await ExternalFileDB.build(fontsAllConfig);
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts', undefined]]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/fonts.tar.gz',
			]);
		});

		it('styles', async () => {
			await ExternalFileDB.build(stylesConfig);
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-style', true]]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/sprites.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/styles.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/versatiles-style.tar.gz',
			]);
		});

		it('fonts-noto', async () => {
			await ExternalFileDB.build(fontsNotoConfig);
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts', undefined]]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/noto_sans.tar.gz',
			]);
		});
	});

	describe('filter callbacks', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			curlCalls.length = 0;
			filterCallbacks.ungzipUntar = null;
			filterCallbacks.unzip = null;
		});

		it('fonts filter renames fonts.json to index.json', async () => {
			await ExternalFileDB.build(fontsAllConfig);
			expect(filterCallbacks.ungzipUntar).toBeTruthy();
			if (filterCallbacks.ungzipUntar) {
				expect(filterCallbacks.ungzipUntar('fonts.json')).toBe('assets/glyphs/index.json');
				expect(filterCallbacks.ungzipUntar('other.json')).toBe('assets/glyphs/other.json');
			}
		});
	});
});
