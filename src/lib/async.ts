/* eslint-disable @typescript-eslint/promise-function-async */

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
