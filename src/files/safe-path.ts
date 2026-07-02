import { isAbsolute, join, relative } from 'path';

/**
 * Joins an (untrusted) archive/package entry name under a destination directory,
 * guarding against "zip-slip" / "tar-slip": a malicious entry such as
 * `../../etc/passwd` or an absolute path must not escape `dest`.
 *
 * @param dest - The trusted destination prefix (e.g. `assets/glyphs/`).
 * @param name - The entry name taken from a downloaded archive or package.
 * @returns The joined path if it stays within `dest`, otherwise `false`.
 */
export function safeJoinDest(dest: string, name: string): string | false {
	if (isAbsolute(name)) return false;

	const joined = join(dest, name);
	const rel = relative(dest, joined);

	// `rel` starting with `..` (or being absolute) means `joined` escaped `dest`.
	if (rel.startsWith('..') || isAbsolute(rel)) return false;

	return joined;
}
