import { createHash } from 'crypto';
import { brotliCompress, constants } from 'zlib';
import { cache } from '../utils/cache';

/**
 * Represents a file with utilities for compression.
 */
export class File {
	public readonly name: string; // Name of the file.

	public readonly hash: string; // Unique hash based on name and content.

	public readonly bufferRaw: Buffer; // Raw buffer content of the file.

	public bufferBr?: Buffer; // Optional compressed buffer content.

	/**
	 * Constructs a File instance.
	 *
	 * @param name - Name of the file.
	 * @param bufferRaw - Raw buffer content of the file.
	 */
	public constructor(name: string, bufferRaw: Buffer) {
		this.name = name;
		this.hash = name + ';' + createHash('sha256').update(bufferRaw).digest('hex');
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
			async () =>
				new Promise((res, rej) =>
					brotliCompress(
						this.bufferRaw,
						{
							params: {
								[constants.BROTLI_PARAM_QUALITY]: 11,
								[constants.BROTLI_PARAM_SIZE_HINT]: this.bufferRaw.length,
							},
						},
						(error, buffer) => {
							if (error) return rej(error);
							res(buffer);
						}
					)
				)
		);
	}
}
