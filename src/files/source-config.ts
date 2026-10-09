/*
 * The configurations of the file sources: what the file databases load, and from where.
 */

/** A component of the release: its name and where it comes from, as the release notes list it. */
export interface SourceInfo {
	name: string;
	url: string;
}

/** How the entries of an archive or package become file names in the bundle. */
export interface EntryMapping {
	/** The folder the entries go to, e.g. `assets/glyphs/`. */
	dest: string;
	/**
	 * Leading folder to drop, e.g. `dist/`. Entries outside of it are skipped, and `include`
	 * and `rename` see the names without it.
	 */
	stripPrefix?: string;
	/** Only entries matching it are taken. */
	include?: RegExp;
	/** Drops the folders of the entries, keeping only the file names. */
	flatten?: boolean;
	/** New names for entries, by their name after `flatten`. */
	rename?: Record<string, string>;
}

export interface AssetConfig extends EntryMapping {
	url: string;
	format: 'tar.gz' | 'tar.zst' | 'zip';
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

export interface NpmSourceConfig extends EntryMapping {
	type: 'npm';
	pkg: string;
	bundle?: NpmBundleConfig;
	source: SourceInfo;
}

export interface StaticSourceConfig {
	type: 'static';
	path: string;
}

export type SourceConfig = ExternalSourceConfig | NpmSourceConfig | StaticSourceConfig;
