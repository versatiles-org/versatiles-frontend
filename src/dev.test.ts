import { jest } from '@jest/globals';

jest.spyOn(process, 'exit').mockImplementationOnce(() => {
	throw new Error('process.exit() was called.');
});
console.error = jest.fn().mockReturnValue(undefined);

// Import all necessary mocks
const { File } = await import('./filesystem/file');
const { FileSystem } = await import('./filesystem/file_system');

const { mockProgress } = await import('./utils/__mocks__/progress');
jest.unstable_mockModule('./utils/progress', () => mockProgress);
const progress = (await import('./utils/progress')).default;

const { mockServer } = await import('./server/__mocks__/server');
jest.unstable_mockModule('./server/server', () => mockServer);
const { Server } = await import('./server/server');

const { mockFrontend } = await import('./frontend/__mocks__/frontend');
jest.unstable_mockModule('./frontend/frontend', () => mockFrontend);
const { Frontend, loadFrontendConfigs } = await import('./frontend/frontend');

const { mockAssets } = await import('./frontend/__mocks__/assets');
jest.unstable_mockModule('./frontend/assets', () => mockAssets);
const { loadAssets: getAssets } = await import('./frontend/assets');

describe('build process', () => {
	beforeEach(() => {
		// Clear mocks before each test
		jest.clearAllMocks();

		// Setup default mock implementations or return values
		jest.mocked(loadFrontendConfigs).mockResolvedValue([{ name: 'frontend', dev: {}, include: ['frontend'] }]);
	});

	it('prepares and starts the server for the specified frontend', async () => {
		// Mock command line arguments (assuming frontendName is "frontend")
		process.argv[2] = 'frontend';

		// Import or require the module here if necessary, ensuring mocks are set up beforehand
		// For dynamic import or to ensure fresh import, consider using jest.isolateModules()
		await jest.isolateModulesAsync(async () => {
			await import('./dev');
		});

		expect(progress.disableAnsi).toHaveBeenCalled();
		expect(progress.setHeader).toHaveBeenCalledWith('Preparing Server');
		expect(getAssets).toHaveBeenCalled();
		expect(loadFrontendConfigs).toHaveBeenCalled();
		expect(Frontend).toHaveBeenCalledWith(
			new FileSystem(new Map([['index.html', new File('index.html', 42, Buffer.from('file content'))]])),
			{ dev: {}, include: ['frontend'], name: 'frontend' },
			expect.any(String),
		);
		expect(Server).toHaveBeenCalled();
		expect(progress.finish).toHaveBeenCalled();

		// Verify the server started with the correct configuration
		// @ts-expect-error too lazy
		const serverInstance = new Server();
		expect(serverInstance.start).toHaveBeenCalled();
	});

	it('exits the process if no frontend name is provided', async () => {
		process.argv.length = 2; // Simulate missing frontend name

		await expect(jest.isolateModulesAsync(async () => {
			await import('./dev');
		})).rejects.toThrow('process.exit() was called.');

		expect(process.exit).toHaveBeenCalledWith(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('set a frontend name as first argument'));
	});
});
