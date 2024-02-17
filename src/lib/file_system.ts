import { brotliCompress, constants } from 'node:zlib';
import cache from './cache.js';

export class File {
	public readonly name: string;

	public readonly hash: string;

	public readonly bufferRaw: Buffer;

	public bufferBr?: Buffer;

	public constructor(name: string, modificationTime: number, bufferRaw: Buffer) {
		this.name = name;
		this.hash = name + ';' + modificationTime + ';' + bufferRaw.length;
		this.bufferRaw = bufferRaw;
	}

	public async compress(): Promise<void> {
		if (this.bufferBr) return;
		this.bufferBr = await cache('compress:' + this.hash, async () => {
			return new Promise(res => {
				brotliCompress(
					this.bufferRaw,
					{
						params: {
							[constants.BROTLI_PARAM_QUALITY]: 11,
							[constants.BROTLI_PARAM_SIZE_HINT]: this.bufferRaw.length,
						},
					},
					(error, buffer) => {
						res(buffer);
					},
				);
			});
		});
	}
}

export class FileSystem {
	private readonly files = new Map<string, File>();

	public constructor(files?: Map<string, File>) {
		if (files) this.files = files;
	}

	public async compress(callback?: (status: number) => void): Promise<void> {
		let sizeSum = 0;
		let sizePos = 0;
		if (callback) {
			for (const file of this.iterate()) {
				if (!file.bufferBr) sizeSum += file.bufferRaw.length;
			}
			callback(0);
		}
		for (const file of this.iterate()) {
			if (file.bufferBr) continue;

			await file.compress();

			if (callback) {
				sizePos += file.bufferRaw.length;
				callback(sizePos / sizeSum);
			}
		}
		if (callback) callback(1);
	}

	public addFile(filename: string, modificationTime: number, buffer: Buffer): void {
		console.log('addFile', filename);
		this.files.set(filename, new File(filename, modificationTime, buffer));
	}

	public getFile(filename: string): Buffer | undefined {
		return this.files.get(filename)?.bufferRaw;
	}

	public clone(): FileSystem {
		return new FileSystem(new Map(this.files));
	}

	public iterate(): IterableIterator<File> {
		return this.files.values();
	}
}
