/* eslint-disable @typescript-eslint/unbound-method */
import { jest } from '@jest/globals';


const { mockReleaseNotes } = await import('./lib/__mocks__/release_notes');
jest.unstable_mockModule('./lib/release_notes', () => mockReleaseNotes);
const { default: notes } = await import('./lib/release_notes');

const { mockCache } = await import('./lib/__mocks__/cache');
jest.unstable_mockModule('./lib/cache', () => mockCache);
const { } = await import('./lib/cache');

const { mockProgress } = await import('./lib/__mocks__/progress');
jest.unstable_mockModule('./lib/progress', () => mockProgress);
const { default: progress } = await import('./lib/progress');

const { mockUtils } = await import('./lib/__mocks__/utils');
jest.unstable_mockModule('./lib/utils', () => mockUtils);
const { cleanupFolder } = await import('./lib/utils');

const { mockAssets } = await import('./lib/__mocks__/assets');
jest.unstable_mockModule('./lib/assets', () => mockAssets);
const { getAssets } = await import('./lib/assets');

const { mockFrontend } = await import('./lib/__mocks__/frontend');
jest.unstable_mockModule('./lib/frontend', () => mockFrontend);
const { generateFrontends } = await import('./lib/frontend');

describe('Build Process', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	it('executes the build process correctly', async () => {
		// Assuming an export was added to make the build process testable
		await jest.isolateModulesAsync(async () => {
			await import('./build');
		});

		// Validate the cleanup of the destination folder
		expect(cleanupFolder).toHaveBeenCalledWith(expect.any(String));

		// Check if assets are fetched and frontends are generated
		expect(getAssets).toHaveBeenCalled();
		expect(generateFrontends).toHaveBeenCalled();

		// Ensure progress tracking is properly set up and concluded
		expect(progress.setHeader).toHaveBeenCalledWith('Building Release');
		expect(progress.finish).toHaveBeenCalled();

		// Confirm that release notes are saved
		expect(notes.save).toHaveBeenCalledWith(expect.any(String));
	});

	// Add more tests as needed to cover different scenarios or failure cases
});
