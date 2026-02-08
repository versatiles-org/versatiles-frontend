import { createReadStream, existsSync } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { resolve } from 'path';

export const releaseDir = new URL('../release', import.meta.url).pathname;

export const hasRelease = existsSync(releaseDir) && existsSync(resolve(releaseDir, 'frontend.tar.gz'));

export async function listTarGzFiles(filename: string): Promise<string[]> {
	const filePath = resolve(releaseDir, filename);
	const files: string[] = [];
	await pipeline(
		createReadStream(filePath),
		createGunzip(),
		tar.t({
			onReadEntry: (entry) => {
				files.push(entry.path);
				entry.resume();
			},
		})
	);
	return files.sort();
}

/** Group files by their first path segment under a prefix. */
export function groupByFolder(files: string[], prefix: string): Map<string, string[]> {
	const groups = new Map<string, string[]>();
	for (const f of files) {
		if (!f.startsWith(prefix)) continue;
		const rest = f.slice(prefix.length);
		const slash = rest.indexOf('/');
		if (slash === -1) continue; // skip files directly in the prefix (e.g. index.json)
		const folder = rest.slice(0, slash);
		const file = rest.slice(slash + 1);
		if (!groups.has(folder)) groups.set(folder, []);
		groups.get(folder)!.push(file);
	}
	return groups;
}
