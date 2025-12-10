import { vi, describe, it, expect, beforeEach } from 'vitest';
import './async_progress/__mocks__/progress';
import './frontend/__mocks__/frontend';
import './files/__mocks__/filedb-external';
import './files/__mocks__/filedb-rollup';
import './files/__mocks__/filedb-static';
import './utils/__mocks__/cache';
import './utils/__mocks__/release_version';

import { Progress } from './async_progress';
const { Frontend } = await import('./frontend/frontend');
const { default: notes } = await import('./utils/__mocks__/release_notes');
const { cleanupFolder } = await import('./utils/__mocks__/utils');

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
		expect(notes.save).toHaveBeenCalledWith(expect.any(String));
	});
});
