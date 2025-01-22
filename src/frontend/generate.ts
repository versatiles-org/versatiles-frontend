import { FileDBs } from '../files/filedbs';
import type { FrontendConfig } from './frontend';
import { Frontend } from './frontend';
import Pf from '../utils/async';
import progress from '../utils/progress';
import type { ProgressLabel } from '../utils/progress';
import { loadFrontendConfigs } from './load';

/**
 * Generates frontend bundles for deployment based on configurations.
 * This function reads frontend configurations, sets the version for release notes,
 * and initiates the bundling process for each frontend configuration in parallel.
 * 
 * @param fileSystem - The file system interface used for file operations.
 * @param projectFolder - The root directory of the project containing the frontend configurations.
 * @param dstFolder - The destination folder where the generated frontend bundles will be saved.
 * @returns A PromiseFunction instance that encapsulates the asynchronous operations of generating all frontends.
 */
export function generateFrontends(fileDBs: FileDBs, dstFolder: string): Pf {
	let s: ProgressLabel;
	let parallel = Pf.parallel();

	return Pf.single(
		async () => {
			s = progress.add('generate frontends');
			const configs = await loadFrontendConfigs();
			const todos = configs.map((config: FrontendConfig): Pf => generateFrontend(config, fileDBs, dstFolder))
			parallel = Pf.parallel(...todos);
			await parallel.init();
		},
		async () => {
			s.start();
			await parallel.run();
			s.end();
		},
	);
}

export function generateFrontend(config: FrontendConfig, fileDBs: FileDBs, dstFolder: string): Pf {
	const { name } = config;
	let s: ProgressLabel, sBr: ProgressLabel, sGz: ProgressLabel;

	return Pf.single(
		async () => {
			// Initialize progress tracking for each step of the frontend generation.
			s = progress.add(name, 1);
			sBr = progress.add(name + '.br.tar.gz', 2);
			sGz = progress.add(name + '.tar.gz', 2);
		},
		async () => {
			// Start the progress trackers.
			s.start();
			sBr.start();
			sGz.start();
			// Create a new Frontend instance and generate the compressed tarballs.
			const frontend = new Frontend(fileDBs, config);
			await Promise.all([
				(async () => { await frontend.saveAsBrTarGz(dstFolder); sBr.end(); })(),
				(async () => { await frontend.saveAsTarGz(dstFolder); sGz.end(); })(),
			])
			sGz.end();
			s.end();
		},
	);
}


