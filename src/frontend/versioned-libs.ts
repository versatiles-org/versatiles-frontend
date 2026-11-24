import type { FileDB } from '../sources';

/** Where the libraries of a frontend live: one folder per library. */
export const LIB_FOLDER = 'assets/lib/';

/**
 * The libraries of a frontend, each also served under a folder named with its version (#97):
 * `assets/lib/maplibre-gl/…` also as `assets/lib/maplibre-gl@6.0.0/…`.
 *
 * A versioned path names one content for good, so a server can let browsers keep it for a year,
 * with the `immutable` setting of versatiles (see the README). The HTML of the frontend loads the
 * versioned paths; the unversioned ones stay for pages elsewhere that embed a library from a
 * tile server.
 *
 * A library from npm or GitHub carries its own version. One that lives in this repository has
 * none and takes the frontend's. The maplibre-gl bundle is built here, so a change to how it
 * is built keeps its path until maplibre's next version: see the `bundle` option in the config.
 */
export class VersionedLibs {
	/** The versioned folder name of each library, by its folder name: `maplibre-gl` → `maplibre-gl@6.0.0`. */
	private readonly folders: Map<string, string>;

	/** Matches `/assets/lib/<name>/` for every library, in HTML. */
	private readonly htmlPattern: RegExp | null;

	public constructor(folders: Map<string, string>) {
		this.folders = folders;
		const names = [...folders.keys()].map(escapeRegExp);
		this.htmlPattern = names.length ? new RegExp(`/${escapeRegExp(LIB_FOLDER)}(${names.join('|')})/`, 'g') : null;
	}

	/**
	 * Collects the libraries of a frontend from its file databases. A library is claimed by the
	 * first database that has files in its folder, as a file is.
	 *
	 * @param fileDBs - The frontend's file databases, in the order it takes files from them.
	 * @param frontendVersion - The version for libraries that have none of their own. Empty to
	 *   leave those unversioned.
	 */
	public static fromFileDBs(fileDBs: Iterable<FileDB>, frontendVersion: string): VersionedLibs {
		const folders = new Map<string, string>();
		for (const fileDB of fileDBs) {
			const version = fileDB.version || frontendVersion;
			for (const file of fileDB.iterate()) {
				const name = libName(file.name);
				if (name == null || folders.has(name)) continue;
				if (!version) continue;
				if (version.includes('/')) throw new Error(`version ${JSON.stringify(version)} of ${name} contains a "/"`);
				folders.set(name, `${name}@${version}`);
			}
		}
		return new VersionedLibs(folders);
	}

	/** The versioned path of a file of a library, or null for any other file. */
	public versionedPath(path: string): string | null {
		const name = libName(path);
		if (name == null) return null;
		const folder = this.folders.get(name);
		if (folder == null) return null;
		return LIB_FOLDER + folder + path.slice(LIB_FOLDER.length + name.length);
	}

	/** The unversioned path of a file under a versioned folder, or null for any other path. */
	public unversionedPath(path: string): string | null {
		for (const [name, folder] of this.folders) {
			const prefix = LIB_FOLDER + folder + '/';
			if (path.startsWith(prefix)) return LIB_FOLDER + name + '/' + path.slice(prefix.length);
		}
		return null;
	}

	/** Points the libraries an HTML file loads from `/assets/lib/<name>/` at their versioned folders. */
	public rewriteHtml(content: Buffer): Buffer {
		if (!this.htmlPattern) return content;
		const html = content.toString('utf8');
		const rewritten = html.replace(this.htmlPattern, (_, name: string) => `/${LIB_FOLDER}${this.folders.get(name)}/`);
		return rewritten === html ? content : Buffer.from(rewritten);
	}

	/** Whether a file is an HTML page, whose library references {@link rewriteHtml} rewrites. */
	public static isHtml(path: string): boolean {
		return path.endsWith('.html');
	}
}

/** The library a path belongs to: `assets/lib/maplibre-gl/x.js` → `maplibre-gl`. */
function libName(path: string): string | null {
	if (!path.startsWith(LIB_FOLDER)) return null;
	const end = path.indexOf('/', LIB_FOLDER.length);
	if (end <= LIB_FOLDER.length) return null;
	const name = path.slice(LIB_FOLDER.length, end);
	// A folder that already carries a version is not a library of its own.
	return name.includes('@') ? null : name;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
