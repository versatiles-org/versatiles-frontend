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
	notes: string;
}

export interface NpmSourceConfig {
	type: 'npm';
	pkg: string;
	include?: RegExp;
	flatten?: boolean;
	dest: string;
	notes: string;
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

export function npmSource(
	pkg: string,
	options: { include?: RegExp; flatten?: boolean; dest: string; notes: string }
): NpmSourceConfig {
	return {
		type: 'npm',
		pkg,
		include: options.include,
		flatten: options.flatten,
		dest: options.dest,
		notes: options.notes,
	};
}

export function staticSource(path: string): StaticSourceConfig {
	return { type: 'static', path };
}
