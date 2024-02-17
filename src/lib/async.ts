/* eslint-disable @typescript-eslint/promise-function-async */

import progress from './progress.js';

export type PromiseFunction = () => Promise<void>;

export function parallel(...fns: PromiseFunction[]): PromiseFunction {
	return async () => {
		await Promise.all(fns.map(fn => fn()));
	};
}

export function sequential(...fns: PromiseFunction[]): PromiseFunction {
	return async () => {
		for (const fn of fns) await fn();
	};
}

export function wrapProgress(message: string, fn: PromiseFunction): PromiseFunction {
	return async () => {
		const s = progress.add(message);
		await fn();
		s.close();
	};
}