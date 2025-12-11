import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock cache module
vi.mock('./utils/cache', () => ({
	cache: vi.fn(async (_action: string, _key: string, cbBuffer: () => Promise<Buffer>) => cbBuffer()),
}));

// Mock release_version module
vi.mock('./utils/release_version', () => ({
	getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(
		async () => '1.2.3'
	),
	getLatestNPMReleaseVersion: vi.fn<(packageName: string) => Promise<string>>(async () => '2.3.4'),
}));

// Mock release_notes module
const releaseNotesMock = {
	add: vi.fn(),
	setVersion: vi.fn(),
	save: vi.fn(),
	labelList: [],
	labelMap: new Map(),
};
vi.mock('./utils/release_notes', () => ({ default: releaseNotesMock }));

// Mock utils module
const cleanupFolder = vi.fn().mockReturnValue(undefined);
const ensureFolder = vi.fn().mockReturnValue(undefined);
vi.mock('./utils/utils', () => ({
	cleanupFolder,
	ensureFolder,
}));

import './async_progress/__mocks__/progress';
import './frontend/__mocks__/frontend';
import './files/__mocks__/filedb-external';
import './files/__mocks__/filedb-rollup';
import './files/__mocks__/filedb-static';

import { Progress } from './async_progress';
const { Frontend } = await import('./frontend/frontend');

describe('Build Process', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('executes the build process correctly', async () => {
		const progress = new Progress();
		progress.disable();

		await import('./build');

		// Validate the cleanup of the destination folder
		expect(cleanupFolder).toHaveBeenCalledWith(expect.any(String));

		// Ensure progress tracking is properly set up and concluded
		expect(progress.setHeader).toHaveBeenCalledWith('Building Release');
		expect(progress.finish).toHaveBeenCalled();
		expect(vi.mocked(Frontend).mock.calls.map((call) => call[1].name)).toEqual([
			'frontend',
			'frontend-dev',
			'frontend-min',
		]);

		// Confirm that release notes are saved
		expect(releaseNotesMock.save).toHaveBeenCalledWith(expect.any(String));
	});
});
