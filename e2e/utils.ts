import { createReadStream, existsSync } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { resolve } from 'path';

export const releaseDir = new URL('../release', import.meta.url).pathname;

export const hasRelease = existsSync(releaseDir)
	&& existsSync(resolve(releaseDir, 'frontend.tar.gz'));

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
		}),
	);
	return files.sort();
}
