import os from 'node:os';

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

		async function next() {
			if (finished) return;
			if (running >= concurrency) return;

			try {
				running++;
				const { done, value } = await iterator.next();
				if (done) {
					running--;
					if (running === 0) {
						finished = true;
						resolve();
					}
					return;
				}

				const currentIndex = index++;

				callback(value as I, currentIndex)
					.then(() => {
						running--;
						// Schedule the next task after completing the current one
						if (!finished) next();
					})
					.catch((err) => {
						finished = true;
						reject(err);
					});

				// Recursively start additional tasks if below concurrency limit
				if (running < concurrency && !finished) next();
			} catch (err) {
				// If an error occurs in the iterator's next method
				finished = true;
				reject(err);
			}
		}

		// Start the initial tasks up to the concurrency limit
		for (let i = 0; i < concurrency; i++) {
			next();
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