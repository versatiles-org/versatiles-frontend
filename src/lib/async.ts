/* eslint-disable @typescript-eslint/require-await */

import type { ProgressLabel } from './progress';
import progress from './progress';

type AsyncFunction = () => Promise<void>;

/**
 * Represents a wrapper around asynchronous functions, allowing for complex async flow control
 * like sequential or parallel execution with optional progress tracking.
 */
export default class PromiseFunction {
	#init?: AsyncFunction;

	#run?: AsyncFunction;

	/**
	 * Protected constructor to prevent direct instantiation, use static factory methods instead.
	 * 
	 * @param init - An asynchronous function to initialize the operation.
	 * @param run - The main asynchronous function to execute.
	 */
	protected constructor(init: AsyncFunction, run: AsyncFunction) {
		this.#init = init;
		this.#run = run;
	}

	/**
	 * Creates a single asynchronous operation.
	 * 
	 * @param init - Initialization function.
	 * @param run - Main execution function.
	 * @returns A new PromiseFunction instance.
	 */
	public static single(init: AsyncFunction, run: AsyncFunction): PromiseFunction {
		return new PromiseFunction(init, run);
	}

	/**
	 * Combines multiple PromiseFunctions to run in parallel.
	 * 
	 * @param pfs - An array of PromiseFunction instances.
	 * @returns A new PromiseFunction instance that runs the provided instances in parallel.
	 */
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

	/**
	 * Combines multiple PromiseFunctions to run sequentially.
	 * 
	 * @param pfs - An array of PromiseFunction instances.
	 * @returns A new PromiseFunction instance that runs the provided instances sequentially.
	 */
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

	/**
	 * Executes multiple PromiseFunctions sequentially.
	 * 
	 * @param pfs - An array of PromiseFunction instances to execute.
	 */
	public static async runSequential(...pfs: PromiseFunction[]): Promise<void> {
		for (const pf of pfs) await pf.init();
		for (const pf of pfs) await pf.run();
	}

	/**
	 * Initializes and then runs a given PromiseFunction.
	 * 
	 * @param pf - The PromiseFunction to execute.
	 */
	public static async run(pf: PromiseFunction): Promise<void> {
		await pf.init();
		await pf.run();
	}

	/**
	 * Wraps a PromiseFunction with progress tracking.
	 * 
	 * @param message - The message to display for progress tracking.
	 * @param pf - The PromiseFunction to wrap.
	 * @returns A new PromiseFunction instance with progress tracking.
	 */
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

	/**
	 * Wraps an asynchronous function with progress tracking, creating a PromiseFunction.
	 * 
	 * @param message - The progress message.
	 * @param indent - Indentation level for progress display.
	 * @param af - The asynchronous function to wrap.
	 * @returns A new PromiseFunction instance.
	 */
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

	/**
	 * Initializes the PromiseFunction, ensuring `init` is only called once.
	 */
	public async init(): Promise<void> {
		const init = this.#init;
		this.#init = undefined;
		if (!init) throw Error('init already used');
		await init();
	}

	/**
	 * Runs the main asynchronous operation of the PromiseFunction, ensuring `run` is only called once.
	 */
	public async run(): Promise<void> {
		const run = this.#run;
		this.#run = undefined;
		if (!run) throw Error('run already used');
		await run();
	}
}
