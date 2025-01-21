import { resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import ignore from 'ignore';
import Pf from '../utils/async';
import progress from '../utils/progress';
import tar from 'tar-stream';
import type { File } from '../files/file';
import type { ProgressLabel } from '../utils/progress';
import { FileDBs } from '../files/filedbs';

/**
 * Configuration for a frontend, detailing included and ignored paths, and development settings.
 */
export interface FrontendConfig<fileDBKeys = string> {
	name: string;
	fileDBs: fileDBKeys[];
	ignore?: string[];
}

/**
 * Represents a frontend, capable of bundling its assets into tarballs and watching for changes.
 */
export class Frontend {
	public readonly fileDBs: FileDBs;

	private readonly config: FrontendConfig;

	private readonly ignoreFilter: (pathname: string) => boolean;

	/**
	 * Constructs a Frontend instance.
	 * 
	 * @param fileSystem - A FileSystem instance for managing file operations.
	 * @param config - Configuration for the frontend, including paths and ignore patterns.
	 * @param frontendsPath - The root path to the frontend assets.
	 */
	public constructor(fileDBs: FileDBs, config: FrontendConfig) {
		this.fileDBs = fileDBs;
		this.config = config;

		// Add ignore patterns if provided.
		const ig = ignore();
		if (config.ignore) ig.add(config.ignore);
		this.ignoreFilter = ig.createFilter();
	}

	/**
	 * Saves the frontend as a Gzip-compressed tarball.
	 * 
	 * @param folder - The destination folder for the tarball.
	 */
	public async saveAsTarGz(folder: string): Promise<void> {
		const pack = tar.pack();
		for (const file of this.iterate()) {
			pack.entry({ name: file.name }, file.bufferRaw);
		}
		pack.finalize();

		await pipeline(
			pack,
			createGzip({ level: 9 }),
			createWriteStream(resolve(folder, this.config.name + '.tar.gz')),
		);
	}

	/**
	 * Saves the frontend as a Brotli-compressed tarball.
	 * 
	 * @param folder - The destination folder for the tarball.
	 */
	public async saveAsBrTarGz(folder: string): Promise<void> {
		const pack = tar.pack();
		for (const file of this.iterate()) {
			pack.entry({ name: file.name + '.br' }, file.bufferBr);
		}
		pack.finalize();

		await pipeline(
			pack,
			createGzip({ level: 9 }),
			createWriteStream(resolve(folder, this.config.name + '.br.tar.gz')),
		);
	}

	/**
	 * Iterates over the frontend's files, filtering out those ignored.
	 */
	private *iterate(): IterableIterator<File> {
		for (const fileDBId of this.config.fileDBs) {
			const fileDB = this.fileDBs.get(fileDBId);
			for (const file of fileDB.iterate()) {
				if (this.ignoreFilter(file.name)) yield file;
			}
		}
	}

	public getFile(path: string): Buffer | null {
		if (!path) return null; // do not ask for empty paths
		if (!this.ignoreFilter(path)) return null;
		for (const fileDBId of this.config.fileDBs) {
			const fileDB = this.fileDBs.get(fileDBId);
			const buffer = fileDB.getFile(path);
			if (buffer) return buffer;
		}
		return null;
	}
}

/**
 * Loads frontend configurations from a `frontends.json` file.
 * 
 * @returns An array of FrontendConfig objects.
 */
export async function loadFrontendConfigs(): Promise<FrontendConfig[]> {
	return (await import('../../frontends/config.ts?' + Date.now())).frontendConfigs;
}

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
			const todos = configs.map((config: FrontendConfig): Pf => generateFrontend(config))
			parallel = Pf.parallel(...todos);
			await parallel.init();
		},
		async () => {
			s.start();
			await parallel.run();
			s.end();
		},
	);


	function generateFrontend(config: FrontendConfig): Pf {
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

}
/*

export function generateFrontends(fileDBs: Map<string, FileDB>, dstFolder: string): Pf {
	const rollupFrontends = new RollupFrontends();

	// Load frontend configurations from the specified folder.
	const frontendConfigs = await loadFrontendConfigs();
	// Read the project version from package.json to use in release notes.

	const frontendVersion = String(JSON.parse(readFileSync(resolve(projectFolder, 'package.json'), 'utf8')).version);
	notes.setVersion(frontendVersion);

	// Use PromiseFunction to wrap the operation in progress tracking,
	// generating each frontend in parallel for efficiency.
	return Pf.wrapProgress('generate frontends',
		Pf.parallel(
			...frontendConfigs.map(config => generateFrontend(config, rollupFrontends)),
		),
	);
	*/