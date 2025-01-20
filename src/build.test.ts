import { jest } from '@jest/globals';


const { mockReleaseNotes } = await import('./utils/__mocks__/release_notes');
jest.unstable_mockModule('./utils/release_notes', () => mockReleaseNotes);
const { default: notes } = await import('./utils/release_notes');

const { mockCache } = await import('./utils/__mocks__/cache');
jest.unstable_mockModule('./utils/cache', () => mockCache);
await import('./utils/cache');

const { mockProgress } = await import('./utils/__mocks__/progress');
jest.unstable_mockModule('./utils/progress', () => mockProgress);
const { default: progress } = await import('./utils/progress');

const { mockUtils } = await import('./utils/__mocks__/utils');
jest.unstable_mockModule('./utils/utils', () => mockUtils);
const { cleanupFolder } = await import('./utils/utils');

const { mockAssets } = await import('./frontend/__mocks__/assets');
jest.unstable_mockModule('./frontend/assets', () => mockAssets);
const { loadAssets: getAssets } = await import('./frontend/assets');

const { mockFrontend } = await import('./frontend/__mocks__/frontend');
jest.unstable_mockModule('./frontend/frontend', () => mockFrontend);
const { generateFrontends } = await import('./frontend/frontend');

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
