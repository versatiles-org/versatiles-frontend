import { forEachAsync } from './parallel';
import { vi, describe, it, expect } from 'vitest';
import os from 'os';

describe('forEachAsync', () => {
	it('should call the callback for each item in the list', async () => {
		const list = [1, 2, 3, 4];
		const callback = vi.fn(async () => {});

		await forEachAsync(list, callback);

		expect(callback).toHaveBeenCalledTimes(list.length);

		list.forEach((item, index) => {
			expect(callback).toHaveBeenCalledWith(item, index);
		});
	});

	it('should handle empty lists without error', async () => {
		const list: number[] = [];
		const callback = vi.fn(async () => {});

		await forEachAsync(list, callback);

		expect(callback).not.toHaveBeenCalled();
	});

	it('should respect the maxParallel limit', async () => {
		// Both bounds matter. `toBeLessThanOrEqual` on its own is also satisfied by an
		// implementation that runs everything strictly one at a time, which would defeat the
		// whole point of the function, so the peak has to be reached exactly.
		expect(await observePeakConcurrency(10, 2)).toBe(2);
		expect(await observePeakConcurrency(10, 5)).toBe(5);
	});

	it('should never run more callbacks than there are items', async () => {
		expect(await observePeakConcurrency(2, 8)).toBe(2);
	});

	it('should reject if any callback call rejects', async () => {
		const list = [1, 2, 3];
		const callback = vi.fn(async (item: number) => {
			if (item === 2) throw new Error('Test error');
		});

		await expect(forEachAsync(list, callback)).rejects.toThrow('Test error');
	});

	it('should resolve successfully when all callbacks are resolved', async () => {
		const list = [1, 2, 3];
		const callback = vi.fn(async () => await tick());

		await expect(forEachAsync(list, callback)).resolves.toBeUndefined();
	});

	it('should process a list of numbers asynchronously', async () => {
		const list = [1, 1, 2, 3, 5];

		await forEachAsync(list, async (item, index) => {
			list[index] = item + 2;
			await tick();
		});

		await forEachAsync(
			list,
			async (item, index) => {
				list[index] = item + 2;
				await tick();
			},
			3
		);

		expect(list).toEqual([5, 5, 6, 7, 9]);
	});

	it('should process items from a synchronous generator', async () => {
		function* syncGenerator() {
			yield 1;
			yield 2;
			yield 3;
		}

		const callback = vi.fn(async () => {});
		await forEachAsync(syncGenerator(), callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, 1, 0);
		expect(callback).toHaveBeenNthCalledWith(2, 2, 1);
		expect(callback).toHaveBeenNthCalledWith(3, 3, 2);
	});

	it('should process items from an asynchronous generator', async () => {
		async function* asyncGenerator() {
			yield 1;
			yield 2;
			yield 3;
		}

		const callback = vi.fn(async () => {});
		await forEachAsync(asyncGenerator(), callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, 1, 0);
		expect(callback).toHaveBeenNthCalledWith(2, 2, 1);
		expect(callback).toHaveBeenNthCalledWith(3, 3, 2);
	});

	it('should process items from an iterator', async () => {
		const iterator = [1, 2, 3][Symbol.iterator]();
		const callback = vi.fn(async () => {});

		await forEachAsync(iterator, callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, 1, 0);
		expect(callback).toHaveBeenNthCalledWith(2, 2, 1);
		expect(callback).toHaveBeenNthCalledWith(3, 3, 2);
	});

	it('should handle errors from an asynchronous generator', async () => {
		async function* asyncErrorGenerator() {
			yield 1;
			yield 2;
			throw new Error('Generator error');
		}

		const callback = vi.fn(async () => {});

		await expect(forEachAsync(asyncErrorGenerator(), callback)).rejects.toThrow('Generator error');
		expect(callback).toHaveBeenCalledTimes(2); // Should only process up to the error
	});

	it('should use CPU count as default maxParallel when not specified', async () => {
		// Enough items that the cap is actually reachable, so this pins the default to the CPU
		// count rather than merely to "something between 1 and the CPU count".
		const cpus = os.cpus().length;
		expect(await observePeakConcurrency(cpus * 2)).toBe(cpus);
	});

	it('should handle async iterator that is already an iterator', async () => {
		// Create an async iterator directly (not an iterable)
		const asyncIterator = (async function* () {
			yield 1;
			yield 2;
			yield 3;
		})();

		const callback = vi.fn(async () => {});

		await forEachAsync(asyncIterator, callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, 1, 0);
		expect(callback).toHaveBeenNthCalledWith(2, 2, 1);
		expect(callback).toHaveBeenNthCalledWith(3, 3, 2);
	});
});

/**
 * Yields for a fixed number of microtask turns.
 *
 * Deliberately not a timer of random length: the concurrency observed below depends on how long
 * a callback stays in flight, so a random delay makes the measurement - and any assertion built
 * on it - differ from run to run. A fixed number of turns is long enough for the scheduler to
 * fill its remaining slots and is identical on every machine.
 */
async function tick(turns = 10): Promise<void> {
	for (let i = 0; i < turns; i++) await Promise.resolve();
}

/**
 * Runs `forEachAsync` over `count` items and reports the highest number of callbacks that were
 * ever in flight at the same time.
 */
async function observePeakConcurrency(count: number, maxParallel?: number): Promise<number> {
	let running = 0;
	let peak = 0;

	await forEachAsync(
		Array.from({ length: count }, (_, i) => i),
		async () => {
			running++;
			peak = Math.max(peak, running);
			await tick();
			running--;
		},
		maxParallel
	);

	return peak;
}
