import { basename, relative, resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { createWriteStream, existsSync, readFileSync, readdirSync, statSync, watch } from 'node:fs';
import { type DevConfig } from '../server/server';
import { pipeline } from 'node:stream/promises';
import ignore from 'ignore';
import notes from './release_notes';
import Pf from '../utils/async';
import progress from '../utils/progress';
import tar from 'tar-stream';
import type { File, FileSystem } from './file_system';
import type { Ignore } from 'ignore';
import type { ProgressLabel } from '../utils/progress';
import type { WatchEventType } from 'node:fs';
import { RollupFrontends } from './rollup';

/**
 * Configuration for a frontend, detailing included and ignored paths, and development settings.
 */
export interface FrontendConfig {
	name: string;
	include: string[];
	ignore?: string[];
	dev?: DevConfig;
}

/**
 * Represents a frontend, capable of bundling its assets into tarballs and watching for changes.
 */
export class Frontend {
	public readonly fileSystem: FileSystem;

	private readonly config: FrontendConfig;

	private readonly frontendsPath: string;

	private readonly ignore: Ignore;

	/**
	 * Constructs a Frontend instance.
	 * 
	 * @param fileSystem - A FileSystem instance for managing file operations.
	 * @param config - Configuration for the frontend, including paths and ignore patterns.
	 * @param frontendsPath - The root path to the frontend assets.
	 */
	public constructor(fileSystem: FileSystem, config: FrontendConfig, frontendsPath: string) {
		this.fileSystem = fileSystem.clone();
		this.ignore = (ignore as unknown as () => Ignore)();
		this.config = config;
		this.frontendsPath = frontendsPath;
	}

	public async build(rollupFrontends: RollupFrontends): Promise<void> {
		// Add files and directories to file system based on include paths.
		for (const include of this.config.include) {
			if (include.startsWith('rollup:')) {
				const id = include.slice(7);
				const rollupFrontend = await rollupFrontends.get(id);
				this.fileSystem.addFileSystem(rollupFrontend);
				continue;
			}

			const fullPath = resolve(this.frontendsPath, include);
			if (!statSync(fullPath).isDirectory()) throw Error(`included directory "${include}" is not a directory`);
			this.addPath(fullPath);
		};

		// Add ignore patterns if provided.
		if (this.config.ignore) this.ignore.add(this.config.ignore);
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
		await this.fileSystem.compress();
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
	 * Watches the included paths for changes, updating the frontend's assets accordingly.
	 */
	public enterWatchMode(): void {
		const rollupFrontends = new RollupFrontends();

		this.config.include.forEach(include => {
			console.log('watching', include);

			if (include.startsWith('rollup:')) {
				const id = include.slice(7);
				rollupFrontends.watch(id, rollupFrontend => {
					this.fileSystem.addFileSystem(rollupFrontend);
				});
				return
			}

			const fullPath = resolve(this.frontendsPath, include);
			watch(fullPath, { recursive: true }, (event: WatchEventType, filename: string | null) => {
				if (filename == null) return;
				const fullname = resolve(fullPath, filename);
				try {
					this.addPath(fullname);
				} catch (_) {
					// Handle errors, e.g., logging or notifications.
				}
			});
		});
	}

	/**
	 * Iterates over the frontend's files, filtering out those ignored.
	 */
	private *iterate(): IterableIterator<File> {
		const filter = this.ignore.createFilter();
		for (const file of this.fileSystem.iterateFiles()) {
			if (filter(file.name)) yield file;
		}
	}

	/**
	 * Adds a path (file or directory) to the frontend, respecting ignore patterns.
	 * 
	 * @param path - The path to add.
	 * @param dir - The root directory for relative path calculations.
	 */
	private addPath(path: string, dir: string = path): void {
		if (!existsSync(path)) throw Error(`path "${path}" does not exist`);
		if (basename(path).startsWith('.')) return; // Skip hidden files and directories.

		const stat = statSync(path);
		if (stat.isDirectory()) {
			readdirSync(path).forEach(name => {
				this.addPath(resolve(path, name), dir);
			});
		} else {
			this.fileSystem.addBufferAsFile(
				relative(dir, path),
				stat.mtimeMs,
				readFileSync(path),
			);
		}
	}
}

/**
 * Loads frontend configurations from a `frontends.json` file.
 * 
 * @returns An array of FrontendConfig objects.
 */
export async function loadFrontendConfigs(): Promise<FrontendConfig[]> {
	return (await import('../../frontends/frontends.ts?' + Date.now())).frontendConfigs;
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
export async function generateFrontends(fileSystem: FileSystem, projectFolder: string, dstFolder: string): Promise<Pf> {
	const rollupFrontends = new RollupFrontends();

	// Resolve the path to the frontends folder within the project directory.
	const frontendsFolder = resolve(projectFolder, 'frontends');

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

	/**
	 * Generates a single frontend bundle based on its configuration.
	 * It compresses the frontend assets into both Brotli-compressed and Gzip-compressed tarballs.
	 * 
	 * @param config - The configuration object for the frontend to be generated.
	 * @returns A PromiseFunction instance for the asynchronous operations of generating the frontend.
	 */
	function generateFrontend(config: FrontendConfig, rollupFrontends: RollupFrontends): Pf {
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
				const frontend = new Frontend(fileSystem, config, frontendsFolder);
				await frontend.build(rollupFrontends);
				await frontend.saveAsBrTarGz(dstFolder);
				sBr.end();
				await frontend.saveAsTarGz(dstFolder);
				sGz.end();
				s.end();
			},
		);
	}
}
