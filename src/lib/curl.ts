
import { resolve as urlResolve } from 'node:url';
import { createGunzip } from 'node:zlib';
import { finished } from 'node:stream/promises';
import tar from 'tar-stream';
import unzipper from 'unzipper';
import type { Entry } from 'unzipper';
import type { FileSystem } from './file_system.js';
import { streamAsBuffer } from './utils.js';
import cache from './cache.js';

export class Curl {
	private readonly url: string;

	private readonly fileSystem: FileSystem;

	public constructor(fileSystem: FileSystem, url: string) {
		this.url = url;
		this.fileSystem = fileSystem;
	}

	public async ungzipUntar(folder: string): Promise<void> {
		const extract = tar.extract();
		extract.on('entry', (header, stream, next) => {
			if (header.type === 'directory') {
				next();
				return;
			}
			if (header.type !== 'file') throw Error(String(header.type));
			const filename = urlResolve(folder, header.name);
			void streamAsBuffer(stream).then((buffer): void => {
				this.fileSystem.addFile(filename, Number(header.mtime ?? Math.random()), buffer);
				next();
				return;
			});
		});
		const streamIn = createGunzip();
		streamIn.pipe(extract);
		streamIn.end(await this.getBuffer());
		await finished(extract);
	}

	public async save(filename: string): Promise<void> {
		this.fileSystem.addFile(filename, Math.random(), await this.getBuffer());
	}

	public async unzip(cbFilter: (filename: string) => string | false): Promise<void> {
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const filename = cbFilter(entry.path);
			if (filename != false) {
				void entry.buffer().then(buffer => {
					this.fileSystem.addFile(filename, entry.vars.lastModifiedTime, buffer);
				});
			} else {
				entry.autodrain();
			}
		});
		zip.end(await this.getBuffer());
		await finished(zip);
	}

	private async getBuffer(): Promise<Buffer> {
		return cache(
			'getBuffer:' + this.url,
			async () => {
				const response = await fetch(this.url, { redirect: 'follow' });
				return Buffer.from(await response.arrayBuffer());
			},
		);
	}
}
