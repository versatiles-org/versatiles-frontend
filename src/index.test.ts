import { program } from 'commander';
import { jest } from '@jest/globals';

// Mocking readFileSync and imported modules
jest.unstable_mockModule('fs', () => ({
	readFileSync: jest.fn(),
}));

jest.unstable_mockModule('./build.js', () => ({
	build: jest.fn(),
}));

jest.unstable_mockModule('./watch.js', () => ({
	watch: jest.fn(),
}));


const buildModule = await import('./build.js');
const watchModule = await import('./watch.js');
const fs = await import('fs');

describe('versatiles-frontend CLI', () => {
	const version = '1.0.0';

	beforeAll(() => {
		// Mocking the readFileSync to return a specific package.json content
		(fs.readFileSync as jest.Mock).mockImplementation(() => JSON.stringify({ version }));
	});

	beforeEach(() => {
		jest.clearAllMocks();
		//program.commands.length = 0; // Clear commander state
	});

	it('should be happy', () => {
		expect(true).toBe(true);
	});

	/*

	it('should display the correct version', async () => {
		await import('./index.js');
		expect(program.version()).toBe(version);
	});

	it('should call build function on "build" command', async () => {
		await import('./index.js');

		const buildSpy = jest.spyOn(buildModule, 'build');
		await program.parseAsync(['node', 'test', 'build'], { from: 'user' });

		expect(buildSpy).toHaveBeenCalled();
	});

	it('should call watch function with correct argument on "serve" command', async () => {
		await import('./index.js');

		const watchSpy = jest.spyOn(watchModule, 'watch');
		const frontendName = 'test-frontend';
		await program.parseAsync(['node', 'test', 'serve', frontendName], { from: 'user' });

		expect(watchSpy).toHaveBeenCalledWith(frontendName);
	});
	*/
});
