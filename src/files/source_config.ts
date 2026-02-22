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

export interface NpmSourceConfig {
	type: 'npm';
	pkg: string;
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
	options: { include?: RegExp; flatten?: boolean; rename?: Record<string, string>; dest: string; source: SourceInfo }
): NpmSourceConfig {
	return {
		type: 'npm',
		pkg,
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
