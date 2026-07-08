import { resolve } from 'path';
import { createGzip } from 'zlib';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import ignore from 'ignore';
import tar from 'tar-stream';
import { File } from '../files/file';
import { FileDBs } from '../files/filedbs';

/**
 * Configuration for a frontend, detailing included and ignored paths, and development settings.
 */
export interface FrontendConfig<fileDBKeys = string> {
	name: string;
	description: string;
	fileDBs: fileDBKeys[];
	ignore?: string[];
	filter?: (filename: string) => boolean;
	/**
	 * Rewrites files just before they are emitted. Return the file unchanged to keep it,
	 * a new {@link File} (same name, different content) to replace it, or `null` to drop it.
	 * Applied after `ignore`/`filter`, so it only sees files that survived those.
	 */
	transform?: (file: File) => File | null;
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

		this.ignoreFilter = this.buildFilter(config);
	}

	private buildFilter(config: FrontendConfig): (pathname: string) => boolean {
		const filters: ((pathname: string) => boolean)[] = [];

		if (config.ignore) {
			const ig = ignore();
			ig.add(config.ignore);
			filters.push(ig.createFilter());
		}

		if (config.filter) filters.push(config.filter);

		return (pathname: string) => filters.every((f) => f(pathname));
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
		// Dedupe by name, first fileDB wins — matching getFile()'s first-match lookup, so
		// overlapping filenames aren't double-counted in the overview or double-emitted in the tar.
		const seen = new Set<string>();
		for (const fileDBId of this.config.fileDBs) {
			const fileDB = this.fileDBs.get(fileDBId);
			for (const file of fileDB.iterate()) {
				if (!this.ignoreFilter(file.name)) continue;
				if (seen.has(file.name)) continue;
				const transformed = this.config.transform ? this.config.transform(file) : file;
				// A transform returning null drops the file without claiming its name, so a
				// later fileDB can still provide it — matching the ignore/filter `continue` above.
				if (transformed == null) continue;
				seen.add(file.name);
				yield transformed;
			}
		}
	}

	public getFile(path: string): Buffer | null {
		if (!path) return null; // do not ask for empty paths
		if (!this.ignoreFilter(path)) return null;
		for (const fileDBId of this.config.fileDBs) {
			const fileDB = this.fileDBs.get(fileDBId);
			const buffer = fileDB.getFile(path);
			if (!buffer) continue;
			if (!this.config.transform) return buffer;
			// Keep the dev server in sync with the tarball: apply the same rewrite here.
			const transformed = this.config.transform(new File(path, buffer));
			if (transformed == null) continue;
			return transformed.bufferRaw;
		}
		return null;
	}
}
