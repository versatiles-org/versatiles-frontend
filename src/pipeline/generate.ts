import type { FileDBs } from '../sources/file-dbs';
import { Frontend, type FrontendConfig } from '../frontend/frontend';
import { saveAsBrTarGz, saveAsTarGz, saveAsTarZst } from '../frontend/tarball';
import { PromiseFunction, progress, type ProgressLabel } from '../async-progress';
import { generateOverview } from './overview';
import type { ReleaseNotes } from './release-notes';

/**
 * Generates frontend bundles for deployment based on configurations.
 * This function initiates the bundling process for each frontend configuration in parallel,
 * and adds the frontends to the release notes.
 *
 * @param fileDBs - The file databases the frontends take their files from.
 * @param frontendConfigs - The frontends to generate.
 * @param dstFolder - The destination folder where the generated frontend bundles will be saved.
 * @param notes - The release notes, which get the list of frontends and the asset overview.
 * @returns A PromiseFunction instance that encapsulates the asynchronous operations of generating all frontends.
 */
export function generateFrontends(
	fileDBs: FileDBs,
	frontendConfigs: FrontendConfig[],
	dstFolder: string,
	notes: ReleaseNotes
): PromiseFunction {
	let s: ProgressLabel;
	let parallel = PromiseFunction.parallel();
	const frontends: Frontend[] = [];

	return PromiseFunction.single(
		async () => {
			s = progress.add('generate frontends');
			const todos = frontendConfigs.map((config: FrontendConfig): PromiseFunction =>
				generateFrontend(config, fileDBs, dstFolder, frontends)
			);
			parallel = PromiseFunction.parallel(...todos);
			await parallel.init();
		},
		async () => {
			s.start();
			await parallel.run();
			notes.append(
				'\n\n## Frontends\n\n' + frontends.map((f) => `- **${f.config.name}**: ${f.config.description}`).join('\n')
			);
			notes.append('\n\n' + generateOverview(frontends, dstFolder));
			s.end();
		}
	);
}

function generateFrontend(
	config: FrontendConfig,
	fileDBs: FileDBs,
	dstFolder: string,
	frontends: Frontend[]
): PromiseFunction {
	const { name } = config;
	let s: ProgressLabel, sBr: ProgressLabel, sGz: ProgressLabel, sZst: ProgressLabel;

	return PromiseFunction.single(
		async () => {
			// Initialize progress tracking for each step of the frontend generation.
			s = progress.add(name, 1);
			sBr = progress.add(name + '.br.tar.gz', 2);
			sGz = progress.add(name + '.tar.gz', 2);
			sZst = progress.add(name + '.tar.zst', 2);
		},
		async () => {
			// Start the progress trackers.
			s.start();
			sBr.start();
			sGz.start();
			sZst.start();
			// Create a new Frontend instance and generate the compressed tarballs.
			const frontend = new Frontend(fileDBs, config);
			frontends.push(frontend);
			await Promise.all([
				(async () => {
					await saveAsBrTarGz(frontend, dstFolder);
					sBr.end();
				})(),
				(async () => {
					await saveAsTarGz(frontend, dstFolder);
					sGz.end();
				})(),
				(async () => {
					await saveAsTarZst(frontend, dstFolder);
					sZst.end();
				})(),
			]);
			s.end();
		}
	);
}
