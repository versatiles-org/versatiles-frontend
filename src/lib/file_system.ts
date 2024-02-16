import { brotliCompress, constants } from 'node:zlib';

export class File {
	public readonly name: string;

	public readonly bufferRaw: Buffer;

	public bufferBr?: Buffer;

	public constructor(name: string, bufferRaw: Buffer) {
		this.name = name;
		this.bufferRaw = bufferRaw;
	}

	public async compress(): Promise<void> {
		if (this.bufferBr) return;
		await new Promise(res => {
			brotliCompress(
				this.bufferRaw,
				{
					params: {
						[constants.BROTLI_PARAM_QUALITY]: 11,
						[constants.BROTLI_PARAM_SIZE_HINT]: this.bufferRaw.length,
					},
				},
				(error, buffer) => {
					this.bufferBr = buffer;
					res(null);
				},
			);
		});
	}
}

export class FileSystem {
	private readonly files = new Map<string, File>();

	public constructor(files?: Map<string, File>) {
		if (files) this.files = files;
	}

	public async precompress(): Promise<void> {
		for (const file of this.files.values()) await file.compress();
	}

	public addFile(filename: string, buffer: Buffer): void {
		this.files.set(filename, new File(filename, buffer));
	}

	public clone(): FileSystem {
		return new FileSystem(new Map(this.files));
	}

	public iterate(): IterableIterator<File> {
		return this.files.values();
	}
}
