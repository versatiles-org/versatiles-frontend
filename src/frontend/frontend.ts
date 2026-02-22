import { resolve } from 'path';
import { createGzip } from 'zlib';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import ignore from 'ignore';
import tar from 'tar-stream';
import type { File } from '../files/file';
import { FileDBs } from '../files/filedbs';

/**
 * Configuration for a frontend, detailing included and ignored paths, and development settings.
 */
export interface FrontendConfig<fileDBKeys = string> {
	name: string;
	fileDBs: fileDBKeys[];
	ignore?: string[];
	filter?: (filename: string) => boolean;
}

/**
 * Represents a frontend, capable of bundling its assets into tarballs and watching for changes.
 */
export class Frontend {
	public readonly fileDBs: FileDBs;

	public readonly config: FrontendConfig;

	public readonly ignoreFilter: (pathname: string) => boolean;

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
		const ignoreCheck = ig.createFilter();
		this.ignoreFilter = config.filter
			? (pathname: string) => ignoreCheck(pathname) && config.filter!(pathname)
			: ignoreCheck;
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

		await pipeline(pack, createGzip({ level: 9 }), createWriteStream(resolve(folder, this.config.name + '.tar.gz')));
	}

	/**
	 * Saves the frontend as a Brotli-compressed tarball.
	 *
	 * @param folder - The destination folder for the tarball.
	 */
	public async saveAsBrTarGz(folder: string): Promise<void> {
		const pack = tar.pack();
		for (const file of this.iterate()) {
			if (!file.bufferBr) await file.compress();
			pack.entry({ name: file.name + '.br' }, file.bufferBr);
		}
		pack.finalize();

		await pipeline(pack, createGzip({ level: 9 }), createWriteStream(resolve(folder, this.config.name + '.br.tar.gz')));
	}

	/**
	 * Iterates over the frontend's files, filtering out those ignored.
	 */
	public *iterate(): IterableIterator<File> {
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
