/* eslint-disable @typescript-eslint/require-await */

import type { ProgressLabel } from './progress.js';
import progress from './progress.js';

type AsyncFunction = () => Promise<void>;

export default class PromiseFunction {
	#init?: AsyncFunction;

	#run?: AsyncFunction;

	protected constructor(init: AsyncFunction, run: AsyncFunction) {
		this.#init = init;
		this.#run = run;
	}

	public static single(init: AsyncFunction, run: AsyncFunction): PromiseFunction {
		return new PromiseFunction(init, run);
	}

	public static parallel(...pfs: PromiseFunction[]): PromiseFunction {
		return new PromiseFunction(
			async () => {
				for (const pf of pfs) await pf.init();
			},
			async () => {
				await Promise.all(pfs.map(async pf => pf.run()));
			},
		);
	}

	public static sequential(...pfs: PromiseFunction[]): PromiseFunction {
		return new PromiseFunction(
			async () => {
				for (const pf of pfs) await pf.init();
			},
			async () => {
				for (const pf of pfs) await pf.run();
			},
		);
	}

	public static async runSequential(...pfs: PromiseFunction[]): Promise<void> {
		for (const pf of pfs) await pf.init();
		for (const pf of pfs) await pf.run();
	}

	public static wrapProgress(message: string, pf: PromiseFunction): PromiseFunction {
		let s: ProgressLabel;
		return new PromiseFunction(
			async () => {
				s = progress.add(message);
				await pf.init();
			},
			async () => {
				s.start();
				await pf.run();
				s.end();
			},
		);
	}

	public static wrapAsync(message: string, indent: number, af: AsyncFunction): PromiseFunction {
		let s: ProgressLabel;
		return new PromiseFunction(
			async () => {
				s = progress.add(message, indent);
			},
			async () => {
				s.start();
				await af();
				s.end();
			},
		);
	}

	public async init(): Promise<void> {
		const init = this.#init;
		this.#init = undefined;
		if (!init) throw Error('init already used');
		await init();
	}

	public async run(): Promise<void> {
		const run = this.#run;
		this.#run = undefined;
		if (!run) throw Error('run already used');
		await run();
	}
}
