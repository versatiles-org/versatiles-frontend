import { vi, describe, it, expect, beforeEach } from 'vitest';
import './utils/__mocks__/progress';
import { Progress } from './utils/progress';
import './frontend/__mocks__/frontend';

await import('./files/__mocks__/filedb-external');
await import('./files/__mocks__/filedb-rollup');
await import('./files/__mocks__/filedb-static');
await import('./utils/__mocks__/cache');
await import('./utils/__mocks__/release_version');
const { Frontend } = await import('./frontend/frontend');
const { default: notes } = await import('./utils/__mocks__/release_notes');
const { cleanupFolder } = await import('./utils/__mocks__/utils');

describe('Build Process', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('executes the build process correctly', async () => {
		const progress = new Progress();
		await import('./build');

		// Validate the cleanup of the destination folder
		expect(cleanupFolder).toHaveBeenCalledWith(expect.any(String));

		// Ensure progress tracking is properly set up and concluded
		expect(progress.setHeader).toHaveBeenCalledWith('Building Release');
		expect(progress.finish).toHaveBeenCalled();
		expect(vi.mocked(Frontend).mock.calls.map(call => call[1].name)).toEqual([
			'frontend',
			'frontend-dev',
			'frontend-min',
		]);

		// Confirm that release notes are saved
		expect(notes.save).toHaveBeenCalledWith(expect.any(String));
	});
});
