
import { resolve } from 'node:path';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';
import unzipper from 'unzipper';
import type { Entry } from 'unzipper';
import type { FileSystem } from './file_system.js';
import { streamAsBuffer } from './utils.js';
import type { ReadableStream } from 'stream/web';

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
			const filename = resolve(folder, header.name);
			void streamAsBuffer(stream).then(buffer => {
				this.fileSystem.addFile(filename, buffer);
				next();
			});
		});
		await pipeline(await this.getStream(), createGunzip(), extract);
	}

	public async save(filename: string): Promise<void> {
		this.fileSystem.addFile(filename, await this.getBuffer());
	}

	public async unzip(cbFilter: (filename: string) => string | false): Promise<void> {
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const filename = cbFilter(entry.path);
			if (filename != false) {
				void entry.buffer().then(buffer => {
					this.fileSystem.addFile(filename, buffer);
				});
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

	private async getBuffer(): Promise<Buffer> {
		const response = await fetch(this.url, { redirect: 'follow' });
		const blob = await response.blob();
		return Buffer.from(await blob.arrayBuffer());
	}
}