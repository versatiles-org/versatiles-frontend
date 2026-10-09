import ignore from 'ignore';
import { File } from '../sources/file';
import type { FileDBs } from '../sources/file-dbs';

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
	 * Rewrites the content of files just before they are emitted. Return the given content to
	 * keep the file, other content to replace it, or `null` to drop it. A file keeps its name.
	 * Applied after `ignore`/`filter`, so it only sees files that survived those.
	 */
	transform?: (name: string, content: Buffer) => Buffer | null;
}

/**
 * A frontend: the files it takes from the file databases, filtered and transformed by its config.
 * tarball.ts packs them into bundles.
 */
export class Frontend {
	public readonly fileDBs: FileDBs;

	public readonly config: FrontendConfig;

	public readonly ignoreFilter: (pathname: string) => boolean;

	/**
	 * @param fileDBs - The file databases the frontend takes its files from.
	 * @param config - Which of them it uses, and how it filters and transforms their files.
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
				const content = this.config.transform ? this.config.transform(file.name, file.bufferRaw) : file.bufferRaw;
				// A transform returning null drops the file without claiming its name, so a
				// later fileDB can still provide it — matching the ignore/filter `continue` above.
				if (content == null) continue;
				seen.add(file.name);
				// An unchanged file keeps its File, and with it the brotli result of the precompression.
				yield content === file.bufferRaw ? file : new File(file.name, content);
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
			const transformed = this.config.transform(path, buffer);
			if (transformed == null) continue;
			return transformed;
		}
		return null;
	}
}
