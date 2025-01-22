import { jest } from '@jest/globals';

console.error = jest.fn(() => { });

// Import all necessary mocks
const { progress } = await import('./utils/__mocks__/progress');
await import('./files/__mocks__/filedb-asset');
await import('./files/__mocks__/filedb-rollup');
await import('./files/__mocks__/filedb-static');
const { FileDBs } = await import('./files/__mocks__/filedbs');
const { loadFrontendConfigs } = await import('./frontend/__mocks__/load');
const { Frontend } = await import('./frontend/__mocks__/frontend');
const { Server } = await import('./server/__mocks__/server');

describe('build process', () => {
	beforeEach(() => {
		// Clear mocks before each test
		jest.clearAllMocks();
	});

	it('prepares and starts the server for the specified frontend', async () => {
		// Mock command line arguments (assuming frontendName is "frontend")
		process.argv[2] = 'frontend';

		// Import or require the module here if necessary, ensuring mocks are set up beforehand
		// For dynamic import or to ensure fresh import, consider using jest.isolateModules()
		await jest.isolateModulesAsync(async () => {
			await import('./dev');
		});

		expect(progress.setHeader).toHaveBeenCalledWith('Preparing Server');
		expect(loadFrontendConfigs).toHaveBeenCalled();

		expect(Frontend.mock.calls).toStrictEqual([[
			expect.any(FileDBs),
			{ name: 'frontend', fileDBs: expect.any(Array) }
		]]);
		expect(Server).toHaveBeenCalled();
		expect(progress.finish).toHaveBeenCalled();

		// Verify the server started with the correct configuration
		const serverInstance = new Server();
		expect(serverInstance.start).toHaveBeenCalled();
	});

	it('exits the process if no frontend name is provided', async () => {
		process.argv.length = 2; // Simulate missing frontend name

		jest.spyOn(process, 'exit').mockImplementationOnce(() => {
			throw new Error('process.exit() was called.');
		});

		await expect(jest.isolateModulesAsync(async () => {
			await import('./dev');
		})).rejects.toThrow('process.exit() was called.');

		expect(process.exit).toHaveBeenCalledWith(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('set a frontend name as first argument'));
	});
});
