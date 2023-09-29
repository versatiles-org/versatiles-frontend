
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createGunzip } from 'node:zlib';
import { finished, pipeline } from 'node:stream/promises';
import tar from 'tar-stream';

export async function cleanupFolder(path) {
	if (existsSync(path)) await rm(path, { recursive: true, maxRetries: 3, retryDelay: 100 });
	ensureFolder(path);
}

export async function copyRecursive(pathSrc, pathDst) {
	await copy('');

	async function copy(fol) {
		const folSrc = resolve(pathSrc, fol);
		const folDst = resolve(pathDst, fol);
		if ((await stat(folSrc)).isDirectory()) {
			ensureFolder(folDst);
			for (let entry of await readdir(folSrc)) {
				if (entry.startsWith('.')) continue;
				copy(join(fol, entry));
			}
		} else {
			await pipeline(
				createReadStream(folSrc),
				createWriteStream(folDst)
			)
		}
	}
}

export function ensureFolder(path) {
	if (existsSync(path)) return;
	ensureFolder(dirname(path));
	mkdirSync(path);
}

export function curl(url) {
	return { save, ungzip_untar }

	async function save(filename) {
		await pipeline(await getStream(), createWriteStream(filename));
	}

	async function ungzip_untar(folder) {
		const extract = tar.extract();
		extract.on('entry', (header, stream, next) => {
			if (header.type === 'directory') return next();
			if (header.type !== 'file') throw Error(header.type);
			let filename = resolve(folder, header.name);
			ensureFolder(dirname(filename));
			finished(stream.pipe(createWriteStream(filename))).then(() => next());
		})
		await pipeline(await getStream(), createGunzip(), extract);
	}

	async function getStream() {
		const response = await fetch(url, { redirect: 'follow' });
		return response.body;
	}
}
