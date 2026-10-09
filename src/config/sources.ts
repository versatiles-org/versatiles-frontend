import type { SourceInfo } from '../utils/release_notes';
import type { AssetConfig, ExternalSourceConfig, NpmSourceConfig, StaticSourceConfig } from '../files/source_config';

/*
 * Shorthands for the file sources in the configuration.
 */

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

export function npmSource(pkg: string, options: Omit<NpmSourceConfig, 'type' | 'pkg'>): NpmSourceConfig {
	return {
		type: 'npm',
		pkg,
		bundle: options.bundle,
		stripPrefix: options.stripPrefix,
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
