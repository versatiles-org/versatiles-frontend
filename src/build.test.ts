import { jest } from '@jest/globals';

await import('./files/__mocks__/filedb-asset');
await import('./files/__mocks__/filedb-static');
await import('./utils/__mocks__/cache');
await import('./utils/__mocks__/release_version');
const { Frontend } = await import('./frontend/__mocks__/frontend');
const { default: notes } = await import('./utils/__mocks__/release_notes');
const { progress } = await import('./utils/__mocks__/progress');
const { cleanupFolder } = await import('./utils/__mocks__/utils');

describe('Build Process', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('executes the build process correctly', async () => {
		await jest.isolateModulesAsync(async () => {
			await import('./build');
		});

		// Validate the cleanup of the destination folder
		expect(cleanupFolder).toHaveBeenCalledWith(expect.any(String));

		// Ensure progress tracking is properly set up and concluded
		expect(progress.setHeader).toHaveBeenCalledWith('Building Release');
		expect(progress.finish).toHaveBeenCalled();
		expect(Frontend.mock.calls.map(call => call[1].name)).toEqual([
			'frontend',
			'frontend-dev',
			'frontend-min',
		]);

		// Confirm that release notes are saved
		expect(notes.save).toHaveBeenCalledWith(expect.any(String));
	});
});
