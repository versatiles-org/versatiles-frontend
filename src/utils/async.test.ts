 
import { jest } from '@jest/globals';
import { toHaveBeenCalledBefore } from 'jest-extended';
import type { ProgressLabel } from './progress';
expect.extend({ toHaveBeenCalledBefore });

const { mockProgress } = await import('./__mocks__/progress');
jest.unstable_mockModule('./progress', () => mockProgress);
const progress = (await import('./progress')).default;

 
const PromiseFunctions = (await import('./async')).default;

function getAsyncMock(): jest.Mock<() => Promise<void>> {

	return jest.fn(async (): Promise<void> => {
		await new Promise(res => setTimeout(res, Math.random() * 50));
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

			await PromiseFunctions.run(PromiseFunctions.parallel(
				PromiseFunctions.single(mockInit1, mockRun1),
				PromiseFunctions.single(mockInit2, mockRun2),
			));

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

			await PromiseFunctions.run(PromiseFunctions.sequential(
				PromiseFunctions.single(mockInit1, mockRun1),
				PromiseFunctions.single(mockInit2, mockRun2),
			));

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
			jest.clearAllMocks();

			const mockInit = getAsyncMock();
			const mockRun = getAsyncMock();

			await PromiseFunctions.run(PromiseFunctions.wrapProgress('Test Progress', PromiseFunctions.single(mockInit, mockRun)));

			const progressLabel = jest.mocked(progress.add).mock.results[0].value as ProgressLabel;

			expect(progress.add).toHaveBeenCalledTimes(1);
			expect(mockInit).toHaveBeenCalledTimes(1);
			expect(mockRun).toHaveBeenCalledTimes(1);
			expect(progressLabel.start).toHaveBeenCalledTimes(1);
			expect(progressLabel.end).toHaveBeenCalledTimes(1);

			expect(progress.add).toHaveBeenCalledWith('Test Progress');

			expect(progress.add).toHaveBeenCalledBefore(mockInit);
			expect(mockInit).toHaveBeenCalledBefore(jest.mocked(progressLabel.start));
			expect(progressLabel.start).toHaveBeenCalledBefore(mockRun);
			expect(mockRun).toHaveBeenCalledBefore(jest.mocked(progressLabel.end));
		});
	});

	describe('wrapAsync', () => {
		it('wraps a async function with progress tracking', async () => {
			jest.clearAllMocks();

			const mockAsync = getAsyncMock();

			await PromiseFunctions.run(PromiseFunctions.wrapAsync('Test Progress', 3, mockAsync));

			const progressLabel = jest.mocked(progress.add).mock.results[0].value as ProgressLabel;

			expect(progress.add).toHaveBeenCalledTimes(1);
			expect(mockAsync).toHaveBeenCalledTimes(1);
			expect(progressLabel.start).toHaveBeenCalledTimes(1);
			expect(progressLabel.end).toHaveBeenCalledTimes(1);

			expect(progress.add).toHaveBeenCalledWith('Test Progress', 3);

			expect(progress.add).toHaveBeenCalledBefore(jest.mocked(progressLabel.start));
			expect(progressLabel.start).toHaveBeenCalledBefore(mockAsync);
			expect(mockAsync).toHaveBeenCalledBefore(jest.mocked(progressLabel.end));
		});
	});
});