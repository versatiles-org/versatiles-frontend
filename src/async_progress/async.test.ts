import { vi, describe, it, expect, Mock } from 'vitest';
import type { ProgressLabel, ProgressLabel as ProgressLabelType, Progress as ProgressType } from './progress';

// Mock progress module
vi.mock('./progress', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('./progress');
	originalModule.default.disable();

	function mockProgressLabel(progressLabel: ProgressLabelType) {
		vi.spyOn(progressLabel, 'updateLabel');
		vi.spyOn(progressLabel, 'start');
		vi.spyOn(progressLabel, 'end');
		vi.spyOn(progressLabel, 'getOutputAnsi');
		vi.spyOn(progressLabel, 'getOutputText');
	}

	class ProgressLabel extends originalModule.ProgressLabel {
		constructor(progress: ProgressType, label: string, indent: number) {
			super(progress, label, indent);
			mockProgressLabel(this);
		}
	}

	class Progress extends originalModule.Progress {
		constructor() {
			super();

			// Wrap the original add method so we can spy on the returned ProgressLabel as well
			const originalAdd = this.add.bind(this);
			this.add = ((name: string, indent = 0): ProgressLabelType => {
				const progressLabel = originalAdd(name, indent);
				mockProgressLabel(progressLabel);
				return progressLabel;
			}) as ProgressType['add'];
		}
	}

	const progress = new Progress();
	vi.spyOn(progress, 'add');
	vi.spyOn(progress, 'disable');
	vi.spyOn(progress, 'finish');
	vi.spyOn(progress, 'redraw');
	vi.spyOn(progress, 'setAnsi');
	vi.spyOn(progress, 'setHeader');
	vi.spyOn(progress, 'write');

	return {
		Progress: vi.fn(function () {
			return progress;
		}),
		default: progress,
		ProgressLabel,
	};
});

import progress from './progress';

const PromiseFunctions = (await import('./async')).default;

function getAsyncMock(): Mock<() => Promise<void>> {
	return vi.fn(async (): Promise<void> => {
		await new Promise((res) => setTimeout(res, Math.random() * 50));
	});
}

describe('PromiseFunction', () => {
	describe('single', () => {
		it('creates and runs a single async operation', async () => {
			const mockInit = getAsyncMock();
			const mockRun = getAsyncMock();

			await PromiseFunctions.run(PromiseFunctions.single(mockInit, mockRun));

			// Verify, that every function was executed once
			expect(mockInit).toHaveBeenCalledTimes(1);
			expect(mockRun).toHaveBeenCalledTimes(1);

			// Verify the order of execution
			expect(mockInit).toHaveBeenCalledBefore(mockRun);
		});
	});

	describe('parallel', () => {
		it('runs multiple PromiseFunctions in parallel', async () => {
			const mockInit1 = getAsyncMock();
			const mockRun1 = getAsyncMock();
			const mockInit2 = getAsyncMock();
			const mockRun2 = getAsyncMock();

			await PromiseFunctions.run(
				PromiseFunctions.parallel(
					PromiseFunctions.single(mockInit1, mockRun1),
					PromiseFunctions.single(mockInit2, mockRun2)
				)
			);

			// Verify, that every function was executed once
			expect(mockInit1).toHaveBeenCalledTimes(1);
			expect(mockRun1).toHaveBeenCalledTimes(1);
			expect(mockInit2).toHaveBeenCalledTimes(1);
			expect(mockRun2).toHaveBeenCalledTimes(1);

			// Verify the order of execution
			expect(mockInit1).toHaveBeenCalledBefore(mockInit2);
			expect(mockInit1).toHaveBeenCalledBefore(mockRun1);
			expect(mockInit2).toHaveBeenCalledBefore(mockRun2);
		});
	});

	describe('sequential', () => {
		it('runs multiple PromiseFunctions sequentially', async () => {
			const mockInit1 = getAsyncMock();
			const mockRun1 = getAsyncMock();
			const mockInit2 = getAsyncMock();
			const mockRun2 = getAsyncMock();

			await PromiseFunctions.run(
				PromiseFunctions.sequential(
					PromiseFunctions.single(mockInit1, mockRun1),
					PromiseFunctions.single(mockInit2, mockRun2)
				)
			);

			// Verify, that every function was executed once
			expect(mockInit1).toHaveBeenCalledTimes(1);
			expect(mockRun1).toHaveBeenCalledTimes(1);
			expect(mockInit2).toHaveBeenCalledTimes(1);
			expect(mockRun2).toHaveBeenCalledTimes(1);

			// Verify the order of execution
			expect(mockInit1).toHaveBeenCalledBefore(mockInit2);
			expect(mockInit2).toHaveBeenCalledBefore(mockRun1);
			expect(mockRun1).toHaveBeenCalledBefore(mockRun2);
		});
	});

	describe('wrapProgress', () => {
		it('wraps a PromiseFunction with progress tracking', async () => {
			vi.clearAllMocks();

			const mockInit = getAsyncMock();
			const mockRun = getAsyncMock();

			await PromiseFunctions.run(
				PromiseFunctions.wrapProgress('Test Progress', PromiseFunctions.single(mockInit, mockRun))
			);

			const progressLabel = vi.mocked(progress.add).mock.results[0].value as ProgressLabel;

			expect(progress.add).toHaveBeenCalledTimes(1);
			expect(mockInit).toHaveBeenCalledTimes(1);
			expect(mockRun).toHaveBeenCalledTimes(1);
			expect(progressLabel.start).toHaveBeenCalledTimes(1);
			expect(progressLabel.end).toHaveBeenCalledTimes(1);

			expect(progress.add).toHaveBeenCalledWith('Test Progress');

			expect(progress.add).toHaveBeenCalledBefore(mockInit);
			expect(mockInit).toHaveBeenCalledBefore(vi.mocked(progressLabel.start));
			expect(progressLabel.start).toHaveBeenCalledBefore(mockRun);
			expect(mockRun).toHaveBeenCalledBefore(vi.mocked(progressLabel.end));
		});
	});

	describe('wrapAsync', () => {
		it('wraps a async function with progress tracking', async () => {
			vi.clearAllMocks();

			const mockAsync = getAsyncMock();

			await PromiseFunctions.run(PromiseFunctions.wrapAsync('Test Progress', 3, mockAsync));

			const progressLabel = vi.mocked(progress.add).mock.results[0].value as ProgressLabel;

			expect(progress.add).toHaveBeenCalledTimes(1);
			expect(mockAsync).toHaveBeenCalledTimes(1);
			expect(progressLabel.start).toHaveBeenCalledTimes(1);
			expect(progressLabel.end).toHaveBeenCalledTimes(1);

			expect(progress.add).toHaveBeenCalledWith('Test Progress', 3);

			expect(progress.add).toHaveBeenCalledBefore(vi.mocked(progressLabel.start));
			expect(progressLabel.start).toHaveBeenCalledBefore(mockAsync);
			expect(mockAsync).toHaveBeenCalledBefore(vi.mocked(progressLabel.end));
		});
	});
});
