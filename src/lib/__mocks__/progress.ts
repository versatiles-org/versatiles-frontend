/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from '../progress';

const originalModule = await import('../progress');
originalModule.default.disable();

function mockProgressLabel(progressLabel: ProgressLabelType): ProgressLabelType {
	jest.spyOn(progressLabel, 'updateLabel');
	jest.spyOn(progressLabel, 'start');
	jest.spyOn(progressLabel, 'end');
	jest.spyOn(progressLabel, 'getOutputAnsi');
	jest.spyOn(progressLabel, 'getOutputText');
	return progressLabel;
}

jest.unstable_mockModule('./progress', () => {
	const ProgressLabel = jest.fn((progress: ProgressType, label: string, indent: number) => {
		return mockProgressLabel(new originalModule.ProgressLabel(progress, label, indent));
	});

	const Progress = jest.fn(() => {
		const progress = new originalModule.Progress();
		jest.spyOn(progress, 'disableAnsi');
		jest.spyOn(progress, 'disable');
		jest.spyOn(progress, 'setHeader');
		jest.spyOn(progress, 'finish');
		jest.spyOn(progress, 'redraw');
		jest.spyOn(progress, 'write');

		// @ts-expect-error too lazy
		// eslint-disable-next-line @typescript-eslint/unbound-method
		progress._add = progress.add;
		jest.spyOn(progress, 'add').mockImplementation((name: string, indent = 0): ProgressLabelType => {
			// @ts-expect-error too lazy
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
			return mockProgressLabel(progress._add(name, indent));
		});
		return progress;
	});

	const progress = new Progress();
	progress.disable();

	return { ProgressLabel, Progress, default: progress };
});


const { default: progress, ProgressLabel, Progress } = await import('../progress');


export default progress;
export { ProgressLabel, Progress };
