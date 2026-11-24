import ignore from 'ignore';
import { File, type FileDBs } from '../sources';
import { VersionedLibs } from './versioned-libs';

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

	/** Files made for this frontend, such as `version.json`. They win over the file databases'. */
	public readonly extraFiles: File[];

	/** The frontend's version, for the versioned folders of libraries that have none of their own. */
	public readonly version: string;

	private versionedLibs?: VersionedLibs;

	/**
	 * @param fileDBs - The file databases the frontend takes its files from.
	 * @param config - Which of them it uses, and how it filters and transforms their files.
	 * @param extraFiles - Files made for this frontend, neither filtered nor transformed.
	 * @param version - The frontend's version (package.json). Empty leaves the libraries of this
	 *   repository without a versioned folder.
	 */
	public constructor(fileDBs: FileDBs, config: FrontendConfig, extraFiles: File[] = [], version = '') {
		this.fileDBs = fileDBs;
		this.config = config;
		this.extraFiles = extraFiles;
		this.version = version;

		this.ignoreFilter = this.buildFilter(config);
	}

	/**
	 * The libraries and their versioned folders. Collected on first use: the file databases are
	 * filled by then, and the versions do not change while the frontend is served.
	 */
	public get libs(): VersionedLibs {
		this.versionedLibs ??= VersionedLibs.fromFileDBs(
			this.config.fileDBs.map((id) => this.fileDBs.get(id)),
			this.version
		);
		return this.versionedLibs;
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
	 * Iterates over the frontend's files, filtering out those ignored. Each file of a library
	 * comes twice, under its path and under the versioned one, and the HTML pages load the
	 * versioned paths.
	 */
	public *iterate(): IterableIterator<File> {
		const { libs } = this;
		// Dedupe by name, first fileDB wins — matching getFile()'s first-match lookup, so
		// overlapping filenames aren't double-counted in the overview or double-emitted in the tar.
		const seen = new Set<string>();
		for (const file of this.extraFiles) {
			seen.add(file.name);
			yield file;
		}
		for (const fileDBId of this.config.fileDBs) {
			const fileDB = this.fileDBs.get(fileDBId);
			for (const file of fileDB.iterate()) {
				if (!this.ignoreFilter(file.name)) continue;
				if (seen.has(file.name)) continue;
				let content = this.config.transform ? this.config.transform(file.name, file.bufferRaw) : file.bufferRaw;
				// A transform returning null drops the file without claiming its name, so a
				// later fileDB can still provide it — matching the ignore/filter `continue` above.
				if (content == null) continue;
				if (VersionedLibs.isHtml(file.name)) content = libs.rewriteHtml(content);
				seen.add(file.name);
				// An unchanged file keeps its File, and with it the brotli result of the precompression.
				const emitted = content === file.bufferRaw ? file : new File(file.name, content);
				yield emitted;
				const versioned = libs.versionedPath(file.name);
				if (versioned != null && !seen.has(versioned)) {
					seen.add(versioned);
					yield emitted.renamed(versioned);
				}
			}
		}
	}

	public getFile(path: string): Buffer | null {
		if (!path) return null; // do not ask for empty paths
		const extraFile = this.extraFiles.find((file) => file.name === path);
		if (extraFile) return extraFile.bufferRaw;
		// Keep the dev server in sync with the tarball: a versioned path is the library's file,
		// and HTML loads the versioned paths.
		const sourcePath = this.libs.unversionedPath(path) ?? path;
		const buffer = this.getSourceFile(sourcePath);
		if (buffer == null || !VersionedLibs.isHtml(sourcePath)) return buffer;
		return this.libs.rewriteHtml(buffer);
	}

	private getSourceFile(path: string): Buffer | null {
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
