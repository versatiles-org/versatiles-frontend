import { execFileSync } from 'child_process';
import { File, type FileDBs } from '../sources';
import type { FrontendConfig } from './frontend';

/** The name of the file at the root of every bundle that says what it was built from. */
export const VERSION_FILENAME = 'version.json';

/** What a build was made from: the same for every frontend of the build. */
export interface BuildInfo {
	/** The version in package.json. */
	version: string;
	/** The commit the build was made from, or null if it is unknown. */
	commit: string | null;
	/** When the build was made, as an ISO 8601 timestamp. */
	built: string;
}

/**
 * The commit a build is made from: `GITHUB_SHA` in GitHub Actions, otherwise the checked-out
 * commit, or null outside of a git checkout.
 *
 * @param folder - A folder of the checkout.
 */
export function getCommit(folder: string): string | null {
	if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
	try {
		return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: folder, encoding: 'utf8', stdio: 'pipe' }).trim();
	} catch {
		return null;
	}
}

/**
 * The `version.json` of a frontend: the version and commit of the build, and the version of each
 * component the frontend contains, so a deployed bundle tells what it was built from.
 */
export function versionFile(config: FrontendConfig, fileDBs: FileDBs, build: BuildInfo): File {
	const components: Record<string, string> = {};
	for (const id of config.fileDBs) {
		const { source, version } = fileDBs.get(id);
		if (source) components[source.name] ??= version;
	}
	const info = { name: 'VersaTiles Frontend', frontend: config.name, ...build, components };
	return new File(VERSION_FILENAME, Buffer.from(JSON.stringify(info, null, '\t') + '\n'));
}
