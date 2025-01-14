import { jest } from '@jest/globals';

jest.unstable_mockModule('supports-color', () => ({ default: { stdout: true } }));
const { Progress } = await import('./progress');



describe('Progress', () => {
	let originalStdoutWrite: typeof process.stdout.write;

	beforeAll(() => {
		// Capture the original process.stdout.write to restore later
		originalStdoutWrite = process.stdout.write;
		// Mock process.stdout.write to prevent actual console output during tests
		// @ts-expect-error too lazy
		process.stdout.write = jest.fn();
	});

	afterAll(() => {
		// Restore the original process.stdout.write after all tests
		process.stdout.write = originalStdoutWrite;
	});

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	it('should add a progress label and redraw', () => {
		const progress = new Progress();
		progress.add('Test Label', 1);

		expect(process.stdout.write).toHaveBeenCalledTimes(2);
		// Check if the output includes the label text
		const writeCalls = (process.stdout.write as jest.Mock).mock.calls;
		const output = writeCalls.map(call => call[0]).join('');
		expect(output).toContain('Test Label');
	});

	it('should handle ANSI disabled', () => {
		const progress = new Progress();
		progress.disableAnsi();
		const label = progress.add('Test Label No ANSI', 1);

		// Verify direct write was used instead of ANSI codes
		expect(process.stdout.write).toHaveBeenCalledTimes(0);

		label.start();

		expect(process.stdout.write).toHaveBeenCalledTimes(1);
		const writeCalls = (process.stdout.write as jest.Mock).mock.calls;
		const output = writeCalls.map(call => call[0]).join('');
		expect(output).toContain('Test Label No ANSI');
		expect(output).not.toContain('\x1b['); // ANSI escape should not be present
	});

	it('should update a label and redraw', () => {
		const progress = new Progress();
		const label = progress.add('Initial Label', 1);
		label.updateLabel('Updated Label');

		expect(process.stdout.write).toHaveBeenCalledTimes(3);
		const writeCalls = (process.stdout.write as jest.Mock).mock.calls;
		const output = writeCalls.map(call => call[0]).join('');
		expect(output).toContain('Updated Label');
	});

	it('should mark a label as finished and redraw', () => {
		const progress = new Progress();
		progress.add('Finishing Label', 1);
		progress.finish();

		expect(process.stdout.write).toHaveBeenCalledTimes(3); // Initial add and finish
		const writeCalls = (process.stdout.write as jest.Mock).mock.calls;
		const output = writeCalls.map(call => call[0]).join('');
		expect(output).toContain('Finished');
	});
});
