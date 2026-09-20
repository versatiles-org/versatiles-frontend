import { vi, describe, it, expect, Mock, beforeEach } from 'vitest';
import type { Progress as ProgressType } from './progress';

vi.mock('supports-color', () => ({ default: { stdout: true } }));
const { Progress } = await import('./progress');

describe('Progress', () => {
	let progress: ProgressType;
	let write: Mock<(text: string) => void>;

	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
		progress = new Progress();
		write = vi.spyOn(progress, 'write').mockImplementation(() => {});
		progress.setAnsi(true);
	});

	function getNewWriteCalls(): string[] {
		const newLines = write.mock.calls.flatMap((call) => {
			const line = String(call[0]);
			return (
				line
					.split('\n')
					// Collapse any run of escape sequences into a single '°'. Matches CSI sequences
					// generally (`\x1b[` + params + a final letter), so cursor movement like
					// `\x1b[12A` is covered too, plus a bare carriage return.
					// eslint-disable-next-line no-control-regex
					.map((line) => line.replace(/(\x1b\[[0-9;]*[A-Za-z]|\r)+/g, () => '°'))
					.filter((line) => line.length > 0)
			);
		});
		write.mockClear();
		return newLines;
	}

	it('should add a progress label and redraw', () => {
		progress.setAnsi(true);
		expect(getNewWriteCalls()).toStrictEqual([]);
		progress.setHeader('Test Header');
		// The trailing '°' is the clear-to-end-of-screen that closes every block.
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°']);
		const label = progress.add('Test Label ANSI', 1);
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°', '°']);
		label.start();
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°', '°']);
		label.end();
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°', '°']);
		progress.finish();
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°', '°Finished°', '°']);
	});

	it('should handle ANSI disabled', () => {
		progress.setAnsi(false);
		expect(getNewWriteCalls()).toStrictEqual([]);
		progress.setHeader('Test Header');
		expect(getNewWriteCalls()).toStrictEqual(['Test Header']);
		const label = progress.add('Test Label No ANSI', 1);
		expect(getNewWriteCalls()).toStrictEqual([]);
		label.start();
		expect(getNewWriteCalls()).toStrictEqual(['    - start: Test Label No ANSI']);
		label.end();
		expect(getNewWriteCalls()).toStrictEqual(['    - finish: Test Label No ANSI']);
		progress.finish();
		expect(getNewWriteCalls()).toStrictEqual(['Finished']);
	});

	it('should update a label and redraw', () => {
		expect(getNewWriteCalls()).toStrictEqual([]);
		expect(progress.header).toStrictEqual(undefined);

		progress.setHeader('test');
		expect(progress.header).toStrictEqual('test');
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°']);

		const label = progress.add('Initial Label', 1);
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°    - Initial Label°', '°']);

		label.updateLabel('Updated Label');
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°    - Updated Label°', '°']);
		expect(label.status).toStrictEqual('new');

		label.end();
		expect(label.status).toStrictEqual('finished');
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°    - Updated Label°', '°']);
	});

	it('should mark a label as finished and redraw', () => {
		progress.add('Finishing Label', 1);
		expect(getNewWriteCalls()).toStrictEqual(['°', '°    - Finishing Label°', '°']);

		progress.finish();
		expect(getNewWriteCalls()).toStrictEqual(['°', '°    - Finishing Label°', '°Finished°', '°']);
	});

	/** Everything written so far, escape codes intact. */
	function rawOutput(): string {
		return write.mock.calls.map((call) => String(call[0])).join('');
	}

	it('never erases the screen or the scrollback', () => {
		progress.setHeader('Building Release');
		const label = progress.add('fetch', 1);
		label.start();
		label.updateLabel('fetch: 50%');
		label.end();
		progress.finish();

		const output = rawOutput();
		// `\x1b[3J` erases the terminal's scrollback and `\x1b[2J` the visible screen. A build
		// tool redrawing its own progress has no business discarding either: whatever the user
		// had in their terminal before the build is theirs, not ours.
		expect(output).not.toContain('\x1b[3J');
		expect(output).not.toContain('\x1b[2J');
		// `\x1b[H` homes the cursor absolutely, which only makes sense when owning the screen.
		expect(output).not.toContain('\x1b[H');
	});

	it('rewinds exactly the number of lines it wrote last time', () => {
		// Relative movement is what lets the block survive the terminal scrolling underneath it.
		progress.setHeader('Building Release');

		write.mockClear();
		progress.add('first', 1);
		// One line had been written before this redraw: the header.
		expect(String(write.mock.calls[0][0]).startsWith('\x1b[1A\r')).toBe(true);

		write.mockClear();
		progress.add('second', 1);
		// Now two: the header and the first label.
		expect(String(write.mock.calls[0][0]).startsWith('\x1b[2A\r')).toBe(true);

		write.mockClear();
		progress.finish();
		// Three: header plus both labels. The 'Finished' line is part of the new block, not the old.
		expect(String(write.mock.calls[0][0]).startsWith('\x1b[3A\r')).toBe(true);
	});

	it('does not rewind on the very first draw', () => {
		// There is nothing above yet; rewinding would step back over the user's own output.
		progress.setHeader('Building Release');

		const first = String(write.mock.calls[0][0]);
		expect(first.startsWith('\x1b[')).toBe(true);
		// A rewind would look like `\x1b[<n>A` at the very start; compared as a string so the
		// escape character does not have to appear inside a regular expression.
		expect(first.slice(0, first.indexOf('m') + 1)).not.toContain('A');
	});

	it('clears below the block so a shorter redraw leaves nothing behind', () => {
		progress.setHeader('Building Release');
		progress.add('only', 1);

		expect(rawOutput().endsWith('\x1b[0J')).toBe(true);
	});
});
