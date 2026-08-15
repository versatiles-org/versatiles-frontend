export interface SourceInfo {
	name: string;
	url: string;
}

export interface AssetConfig {
	url: string;
	format: 'tar.gz' | 'zip';
	dest: string;
	include?: RegExp;
	flatten?: boolean;
	rename?: Record<string, string>;
}

interface GithubVersionConfig {
	github: string;
	prerelease?: boolean;
	pin?: string;
}

export interface ExternalSourceConfig {
	type: 'external';
	version: GithubVersionConfig;
	assets: AssetConfig[];
	source?: SourceInfo;
}

/**
 * Bundles an ESM-only package into a classic script that assigns a global,
 * so it can be loaded with a plain `<script src>` tag.
 */
export interface NpmBundleConfig {
	/** Entry point, relative to the package root, e.g. `dist/maplibre-gl.mjs`. */
	entry: string;
	/** Global variable the bundle assigns to, e.g. `maplibregl`. */
	globalName: string;
	/** Output file name, relative to `dest`, e.g. `maplibre-gl.js`. */
	outfile: string;
	/**
	 * JavaScript run after the global object is assembled but before it is published,
	 * with the object in scope under `globalName`. Use it to configure the library.
	 */
	setup?: string;
}

export interface NpmSourceConfig {
	type: 'npm';
	pkg: string;
	bundle?: NpmBundleConfig;
	include?: RegExp;
	flatten?: boolean;
	rename?: Record<string, string>;
	dest: string;
	source: SourceInfo;
}

export interface StaticSourceConfig {
	type: 'static';
	path: string;
}

export type SourceConfig = ExternalSourceConfig | NpmSourceConfig | StaticSourceConfig;

interface GithubSourceOptions {
	prerelease?: boolean;
	pin?: string;
	assets: AssetConfig[];
	source?: SourceInfo;
}

export function githubSource(repo: string, options: GithubSourceOptions): ExternalSourceConfig {
	return {
		type: 'external',
		version: { github: repo, prerelease: options.prerelease, pin: options.pin },
		assets: options.assets,
		source: options.source,
	};
}

export function npmSource(
	pkg: string,
	options: {
		bundle?: NpmBundleConfig;
		include?: RegExp;
		flatten?: boolean;
		rename?: Record<string, string>;
		dest: string;
		source: SourceInfo;
	}
): NpmSourceConfig {
	return {
		type: 'npm',
		pkg,
		bundle: options.bundle,
		include: options.include,
		flatten: options.flatten,
		rename: options.rename,
		dest: options.dest,
		source: options.source,
	};
}

export function staticSource(path: string): StaticSourceConfig {
	return { type: 'static', path };
}
