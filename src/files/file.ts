import { createHash } from 'crypto';
import { brotliCompress, constants } from 'zlib';
import { cache } from '../utils/cache';

/**
 * Represents a file with utilities for compression.
 */
export class File {
	public readonly name: string; // Name of the file.

	public readonly contentHash: string; // Hash based on content only.

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
		this.contentHash = createHash('sha256').update(bufferRaw).digest('hex');
		this.bufferRaw = bufferRaw;
	}

	/**
	 * Compresses the raw buffer using Brotli algorithm and caches the result.
	 *
	 * Keyed on the content alone, never on the name: brotli output is a pure function of its
	 * input, and identical content under different names is the rule here rather than the
	 * exception - the fonts bundle repeats one empty glyph range under tens of thousands of
	 * names. Including the name would compress each of them separately.
	 *
	 * @returns The compressed buffer, so callers get a defined value without re-checking
	 *          the optional {@link bufferBr} field.
	 */
	public async compress(): Promise<Buffer> {
		if (this.bufferBr) return this.bufferBr; // Skip if already compressed.
		this.bufferBr = await cache(
			'compress',
			this.contentHash,
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
		return this.bufferBr;
	}
}
