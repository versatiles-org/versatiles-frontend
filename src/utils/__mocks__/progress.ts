import { jest } from '@jest/globals';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from '../progress';

const originalModule = await import('../progress?' + Math.random());
originalModule.default.disable();

function mockProgressLabel(progressLabel: ProgressLabelType): ProgressLabelType {
	jest.spyOn(progressLabel, 'updateLabel');
	jest.spyOn(progressLabel, 'start');
	jest.spyOn(progressLabel, 'end');
	jest.spyOn(progressLabel, 'getOutputAnsi');
	jest.spyOn(progressLabel, 'getOutputText');
	return progressLabel;
}

export const ProgressLabel = jest.fn((progress: ProgressType, label: string, indent: number) => {
	return mockProgressLabel(new originalModule.ProgressLabel(progress, label, indent));
});

export const Progress = jest.fn(() => {
	const progress = new originalModule.Progress();
	jest.spyOn(progress, 'disableAnsi');
	jest.spyOn(progress, 'disable');
	jest.spyOn(progress, 'setHeader');
	jest.spyOn(progress, 'finish');
	jest.spyOn(progress, 'redraw');
	jest.spyOn(progress, 'write');


	progress._add = progress.add;
	progress.add = jest.fn((name: string, indent = 0): ProgressLabelType => {
		return mockProgressLabel(progress._add(name, indent));
	});
	return progress;
});

export const progress = new Progress();
progress.disable();

const mockProgress = {
	ProgressLabel, Progress, default: progress,
} as unknown as jest.Mocked<typeof import('../progress')>;

try { jest.unstable_mockModule('../progress', () => mockProgress) } catch (_) { /* */ }
try { jest.unstable_mockModule('./progress', () => mockProgress) } catch (_) { /* */ }
try { jest.unstable_mockModule('./utils/progress', () => mockProgress) } catch (_) { /* */ }
