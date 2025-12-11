import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from '../async_progress/progress';

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

// Mock curl module
vi.mock('../utils/curl', async () => await import('../utils/__mocks__/curl'));

// Mock release_version module
vi.mock('../utils/release_version', () => ({
	getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(
		async () => '1.2.3'
	),
	getLatestNPMReleaseVersion: vi.fn<(packageName: string) => Promise<string>>(async () => '2.3.4'),
}));

import { ExternalFileDB } from './filedb-external';
import { curlCalls } from '../utils/curl';
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
	});
});
