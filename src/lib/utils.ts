
import { readdir, rm, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createGunzip } from 'node:zlib';
import { finished, pipeline } from 'node:stream/promises';
import tar from 'tar-stream';
import unzipper from 'unzipper';
import type { ReadableStream } from 'node:stream/web';
import type { Entry } from 'unzipper';

export async function cleanupFolder(path: string): Promise<void> {
	if (existsSync(path)) await rm(path, { recursive: true, maxRetries: 3, retryDelay: 100 });
	ensureFolder(path);
}

export async function copyRecursive(pathSrc: string, pathDst: string): Promise<void> {
	await copy('');

	async function copy(fol: string): Promise<void> {
		const folSrc = resolve(pathSrc, fol);
		const folDst = resolve(pathDst, fol);
		if ((await stat(folSrc)).isDirectory()) {
			ensureFolder(folDst);
			for (const entry of await readdir(folSrc)) {
				if (entry.startsWith('.')) continue;
				await copy(join(fol, entry));
			}
		} else {
			await pipeline(
				createReadStream(folSrc),
				createWriteStream(folDst),
			);
		}
	}
}

export function ensureFolder(path: string): void {
	if (existsSync(path)) return;
	ensureFolder(dirname(path));
	mkdirSync(path);
}

export class Curl {
	private readonly url: string;

	public constructor(url: string) {
		this.url = url;
	}

	public async ungzipUntar(folder: string): Promise<void> {
		const extract = tar.extract();
		extract.on('entry', (header, stream, next) => {
			if (header.type === 'directory') {
				next();
				return;
			}
			if (header.type !== 'file') throw Error(String(header.type));
			const filename = resolve(folder, header.name);
			ensureFolder(dirname(filename));
			void finished(stream.pipe(createWriteStream(filename))).then(() => {
				next();
				return;
			});
		});
		await pipeline(await this.getStream(), createGunzip(), extract);
	}

	public async getLatestGitTag(): Promise<string> {
		const data = await this.getJSON();
		if (!Array.isArray(data)) throw Error();
		for (const entry of data) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const name = String(entry.name);
			if (name.startsWith('v')) return name.slice(1);
		}
		return '';
	}

	public async save(filename: string): Promise<void> {
		await pipeline(await this.getStream(), createWriteStream(filename));
	}

	public async unzip(cb: (filename: string) => string | false): Promise<void> {
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const filename = cb(entry.path);
			if (filename != false) {
				entry.pipe(createWriteStream(filename));
			} else {
				entry.autodrain();
			}
		});
		await pipeline(await this.getStream(), zip);
	}

	private async getStream(): Promise<ReadableStream> {
		const response = await fetch(this.url, { redirect: 'follow' });
		if (response.body == null) throw Error();
		return response.body;
	}

	private async getJSON(): Promise<unknown> {
		const response = await fetch(this.url, { redirect: 'follow' });
		return response.json();
	}
}
