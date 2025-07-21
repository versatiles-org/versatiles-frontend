import { brotliCompress, constants } from 'zlib';
import { cache } from '../utils/cache';

/**
 * Represents a file with utilities for compression.
 */
export class File {
	public readonly name: string; // Name of the file.

	public readonly hash: string; // Unique hash based on name, modification time, and size.

	public readonly bufferRaw: Buffer; // Raw buffer content of the file.

	public bufferBr?: Buffer; // Optional compressed buffer content.

	/**
	 * Constructs a File instance.
	 * 
	 * @param name - Name of the file.
	 * @param modificationTime - Last modification time, used in generating the hash.
	 * @param bufferRaw - Raw buffer content of the file.
	 */
	public constructor(name: string, modificationTime: number, bufferRaw: Buffer) {
		this.name = name;
		this.hash = name + ';' + modificationTime + ';' + bufferRaw.length;
		this.bufferRaw = bufferRaw;
	}

	/**
	 * Compresses the raw buffer using Brotli algorithm and caches the result.
	 */
	public async compress(): Promise<void> {
		if (this.bufferBr) return; // Skip if already compressed.
		this.bufferBr = await cache(
			'compress',
			this.hash,
			async () => new Promise((res, rej) => brotliCompress(
				this.bufferRaw,
				{
					params: {
						[constants.BROTLI_PARAM_QUALITY]: 11,
						[constants.BROTLI_PARAM_SIZE_HINT]: this.bufferRaw.length,
					},
				},
				(error, buffer) => {
					if (error) return rej(error);;
					res(buffer);
				},
			)),
		);
	}
}