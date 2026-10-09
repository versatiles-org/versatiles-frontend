import { basename, isAbsolute, join, relative } from 'path';
import type { EntryMapping } from './source_config';

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

/**
 * Maps the name of an archive or package entry to its file name in the bundle: drops the
 * `stripPrefix`, applies `include`, `flatten` and `rename`, and puts it under `dest`.
 *
 * @returns The file name, or `false` to skip the entry. An entry that would escape `dest` is
 *          skipped with a warning.
 */
export function mapEntryName(mapping: EntryMapping, name: string): string | false {
	let path = name;
	if (mapping.stripPrefix) {
		if (!path.startsWith(mapping.stripPrefix)) return false;
		path = path.slice(mapping.stripPrefix.length);
	}
	if (mapping.include && !mapping.include.test(path)) return false;
	if (mapping.flatten) path = basename(path);
	path = mapping.rename?.[path] ?? path;

	const dest = safeJoinDest(mapping.dest, path);
	if (dest === false) console.warn(`Skipping unsafe entry "${name}" (escapes "${mapping.dest}")`);
	return dest;
}
