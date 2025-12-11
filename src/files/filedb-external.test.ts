import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from '../async_progress/progress';
import type { Curl as CurlType } from '../utils/curl';

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
	getLatestNPMReleaseVersion: vi.fn<(packageName: string) => Promise<string>>(async () => '2.3.4'),
}));

import { ExternalFileDB } from './filedb-external';
import { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } from '../utils/release_version';

describe('getAssets', () => {
	function getGHCalls() {
		const calls = getLatestGithubReleaseVersion.mock.calls;
		calls.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
		return calls;
	}

	function getNPMCalls() {
		const calls = getLatestNPMReleaseVersion.mock.calls.map((e) => e[0]);
		calls.sort((a, b) => a.localeCompare(b));
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
			await ExternalFileDB.build({ type: 'external', source: 'fonts-all' });
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts']]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/fonts.tar.gz',
			]);
		});

		it('styles', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'styles' });
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-style', true]]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/sprites.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/styles.tar.gz',
				'https://github.com/versatiles-org/versatiles-style/releases/download/v1.2.3/versatiles-style.tar.gz',
			]);
		});

		it('maplibre', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'maplibre' });
			expect(getGHCalls()).toStrictEqual([['maplibre', 'maplibre-gl-js']]);
			const calls = getCurlCalls();
			expect(calls[0]).toMatch(
				/https:\/\/github.com\/maplibre\/maplibre-gl-js\/releases\/download\/v\d+\.\d+\.\d+\/dist.zip/
			);
		});

		it('maplibre-inspect', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'maplibre-inspect' });
			expect(getNPMCalls()).toStrictEqual(['@maplibre/maplibre-gl-inspect']);
			expect(getCurlCalls()).toStrictEqual([
				'https://registry.npmjs.org/@maplibre/maplibre-gl-inspect/-/maplibre-gl-inspect-2.3.4.tgz',
			]);
		});

		it('mapbox-rtl-text', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'mapbox-rtl-text' });
			expect(getNPMCalls()).toStrictEqual(['@mapbox/mapbox-gl-rtl-text']);
			expect(getCurlCalls()).toStrictEqual([
				'https://registry.npmjs.org/@mapbox/mapbox-gl-rtl-text/-/mapbox-gl-rtl-text-2.3.4.tgz',
			]);
		});

		it('fonts-noto', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'fonts-noto' });
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'versatiles-fonts']]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/versatiles-fonts/releases/download/v1.2.3/noto_sans.tar.gz',
			]);
		});

		it('maplibre-versatiles-styler', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'maplibre-versatiles-styler' });
			expect(getGHCalls()).toStrictEqual([['versatiles-org', 'maplibre-versatiles-styler']]);
			expect(getCurlCalls()).toStrictEqual([
				'https://github.com/versatiles-org/maplibre-versatiles-styler/releases/download/v1.2.3/maplibre-versatiles-styler.tar.gz',
			]);
		});
	});

	describe('error handling', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			curlCalls.length = 0;
		});

		it('throws error for unknown source', async () => {
			await expect(ExternalFileDB.build({ type: 'external', source: 'unknown-source' as never })).rejects.toThrow(
				'Unknown external file source: unknown-source'
			);
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
			await ExternalFileDB.build({ type: 'external', source: 'fonts-all' });
			expect(filterCallbacks.ungzipUntar).toBeTruthy();
			if (filterCallbacks.ungzipUntar) {
				expect(filterCallbacks.ungzipUntar('fonts.json')).toBe('assets/glyphs/index.json');
				expect(filterCallbacks.ungzipUntar('other.json')).toBe('assets/glyphs/other.json');
			}
		});

		it('maplibre filter accepts only js, css, and map files', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'maplibre' });
			expect(filterCallbacks.unzip).toBeTruthy();
			if (filterCallbacks.unzip) {
				expect(filterCallbacks.unzip('dist/maplibre-gl.js')).toContain('maplibre-gl.js');
				expect(filterCallbacks.unzip('dist/maplibre-gl.css')).toContain('maplibre-gl.css');
				expect(filterCallbacks.unzip('dist/maplibre-gl.js.map')).toContain('maplibre-gl.js.map');
				expect(filterCallbacks.unzip('dist/readme.txt')).toBe(false);
				expect(filterCallbacks.unzip('other/file.js')).toBe(false);
			}
		});

		it('maplibre-inspect filter accepts only js, css, and map files from package/dist', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'maplibre-inspect' });
			expect(filterCallbacks.ungzipUntar).toBeTruthy();
			if (filterCallbacks.ungzipUntar) {
				expect(filterCallbacks.ungzipUntar('package/dist/maplibre-gl-inspect.js')).toContain('maplibre-gl-inspect.js');
				expect(filterCallbacks.ungzipUntar('package/dist/maplibre-gl-inspect.css')).toContain(
					'maplibre-gl-inspect.css'
				);
				expect(filterCallbacks.ungzipUntar('package/dist/maplibre-gl-inspect.js.map')).toContain(
					'maplibre-gl-inspect.js.map'
				);
				expect(filterCallbacks.ungzipUntar('package/dist/readme.txt')).toBe(false);
				expect(filterCallbacks.ungzipUntar('package/other/file.js')).toBe(false);
			}
		});

		it('maplibre-versatiles-styler filter processes all files', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'maplibre-versatiles-styler' });
			expect(filterCallbacks.ungzipUntar).toBeTruthy();
			if (filterCallbacks.ungzipUntar) {
				expect(filterCallbacks.ungzipUntar('styler.js')).toContain('styler.js');
				expect(filterCallbacks.ungzipUntar('path/to/file.css')).toContain('file.css');
			}
		});

		it('mapbox-rtl-text filter accepts only js, css, and map files from package/dist', async () => {
			await ExternalFileDB.build({ type: 'external', source: 'mapbox-rtl-text' });
			expect(filterCallbacks.ungzipUntar).toBeTruthy();
			if (filterCallbacks.ungzipUntar) {
				expect(filterCallbacks.ungzipUntar('package/dist/mapbox-gl-rtl-text.js')).toContain('mapbox-gl-rtl-text.js');
				expect(filterCallbacks.ungzipUntar('package/dist/mapbox-gl-rtl-text.js.map')).toContain(
					'mapbox-gl-rtl-text.js.map'
				);
				expect(filterCallbacks.ungzipUntar('package/dist/readme.txt')).toBe(false);
				expect(filterCallbacks.ungzipUntar('package/src/file.js')).toBe(false);
			}
		});
	});
});
