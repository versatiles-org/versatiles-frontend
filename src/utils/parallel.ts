import os from 'os';

export function forEachAsync<I>(
	items: Iterable<I> | AsyncIterable<I> | Iterator<I> | AsyncIterator<I> | IterableIterator<I>,
	callback: (item: I, index: number) => Promise<void>,
	maxParallel?: number
): Promise<void> {
	const concurrency = maxParallel ?? os.cpus().length;
	let index = 0;
	let finished = false;

	return new Promise((resolve, reject) => {
		let running = 0;
		const iterator = getIterator(items);

		// `next` never rejects: its whole body is wrapped below, and a failure is reported through
		// `reject` instead of thrown. That is why the recursive calls can be left unawaited -
		// awaiting them would serialise the very work this function exists to run in parallel.
		async function next(): Promise<void> {
			if (finished) return;
			if (running >= concurrency) return;

			try {
				running++;
				const result = await iterator.next();
				if (result.done) {
					running--;
					if (running === 0) {
						finished = true;
						resolve();
					}
					return;
				}

				const currentIndex = index++;

				callback(result.value, currentIndex)
					.then(() => {
						running--;
						// Schedule the next task after completing the current one
						if (!finished) void next();
					})
					.catch((err: unknown) => {
						finished = true;
						reject(err);
					});

				// Recursively start additional tasks if below concurrency limit
				if (running < concurrency && !finished) void next();
			} catch (err) {
				// If an error occurs in the iterator's next method
				finished = true;
				reject(err);
			}
		}

		// Start the initial tasks up to the concurrency limit
		for (let i = 0; i < concurrency; i++) {
			void next();
		}
	});
}

function getIterator<V>(
	iterator: Iterable<V> | AsyncIterable<V> | Iterator<V> | AsyncIterator<V>
): AsyncIterator<V> | Iterator<V> {
	if (Symbol.asyncIterator in iterator) return iterator[Symbol.asyncIterator]();
	if (Symbol.iterator in iterator) return iterator[Symbol.iterator]();
	return iterator;
}
