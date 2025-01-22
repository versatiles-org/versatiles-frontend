import { jest } from '@jest/globals';
import type { Progress as ProgressType } from './progress';

jest.unstable_mockModule('supports-color', () => ({ default: { stdout: true } }));
const { Progress } = await import('./progress');

describe('Progress', () => {
	let progress: ProgressType;
	let write: jest.SpiedFunction<(text: string) => void>;

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
		progress = new Progress();
		write = jest.spyOn(progress, 'write').mockImplementation(() => { });
		progress.setAnsi(true);
	});

	function getNewWriteCalls(): string[] {
		const newLines = write.mock.calls.flatMap(call => {
			const line = String(call[0]);
			return line.split('\n')
				// eslint-disable-next-line no-control-regex
				.map(line => line.replace(/(\x1b(\d|\[(\d[JmK]|H))?)+/g, () => '°')) // Remove ANSI codes
				.filter(line => line.length > 0);
		});
		write.mockClear();
		return newLines;
	}

	it('should add a progress label and redraw', () => {
		progress.setAnsi(true);
		expect(getNewWriteCalls()).toStrictEqual([]);
		progress.setHeader('Test Header');
		expect(getNewWriteCalls()).toStrictEqual(['°', '°Test Header°']);
		const label = progress.add('Test Label ANSI', 1);
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°',]);
		label.start();
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°',]);
		label.end();
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°']);
		progress.finish();
		expect(getNewWriteCalls()).toStrictEqual(['°Test Header°', '°    - Test Label ANSI°', '°Finished°']);
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
		expect(getNewWriteCalls()).toStrictEqual(['°', '°test°']);

		const label = progress.add('Initial Label', 1);
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°    - Initial Label°']);

		label.updateLabel('Updated Label');
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°    - Updated Label°']);
		expect(label.status).toStrictEqual('new');

		label.end();
		expect(label.status).toStrictEqual('finished');
		expect(getNewWriteCalls()).toStrictEqual(['°test°', '°    - Updated Label°']);
	});

	it('should mark a label as finished and redraw', () => {
		progress.add('Finishing Label', 1);
		expect(getNewWriteCalls()).toStrictEqual(['°', '°', '°    - Finishing Label°']);

		progress.finish();
		expect(getNewWriteCalls()).toStrictEqual(['°', '°    - Finishing Label°', '°Finished°',]);
	});
});
