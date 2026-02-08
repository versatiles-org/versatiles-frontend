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

interface NpmVersionConfig {
	npm: string;
}

export interface ExternalSourceConfig {
	type: 'external';
	version: GithubVersionConfig | NpmVersionConfig;
	assets: AssetConfig[];
	notes: string;
}

export interface StaticSourceConfig {
	type: 'static';
	path: string;
}

export interface RollupSourceConfig {
	type: 'rollup';
	path: string;
	url: string;
	globalVariable: string;
}

export type SourceConfig = ExternalSourceConfig | StaticSourceConfig | RollupSourceConfig;

interface GithubSourceOptions {
	prerelease?: boolean;
	pin?: string;
	assets: AssetConfig[];
	notes: string;
}

export function githubSource(repo: string, options: GithubSourceOptions): ExternalSourceConfig {
	return {
		type: 'external',
		version: { github: repo, prerelease: options.prerelease, pin: options.pin },
		assets: options.assets,
		notes: options.notes,
	};
}

interface NpmSourceOptions {
	assets: AssetConfig[];
	notes: string;
}

export function npmSource(pkg: string, options: NpmSourceOptions): ExternalSourceConfig {
	return {
		type: 'external',
		version: { npm: pkg },
		assets: options.assets,
		notes: options.notes,
	};
}

export function staticSource(path: string): StaticSourceConfig {
	return { type: 'static', path };
}

export function rollupSource(path: string, url: string, globalVariable: string): RollupSourceConfig {
	return { type: 'rollup', path, url, globalVariable };
}
