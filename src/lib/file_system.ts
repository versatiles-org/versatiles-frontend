import { brotliCompress, constants } from 'node:zlib';
import cache from './cache.js';

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

/**
 * A custom file system interface for storing and managing File instances.
 */
export class FileSystem {
	private readonly files = new Map<string, File>(); // A map to store File instances.

	/**
	 * Constructs a FileSystem instance optionally with an existing map of files.
	 * 
	 * @param files - An optional map of files to initialize the file system.
	 */
	public constructor(files?: Map<string, File>) {
		if (files) this.files = files;
	}

	/**
	 * Compresses all files in the system that are not already compressed, optionally reporting progress.
	 * 
	 * @param callback - Optional callback to report compression progress.
	 */
	public async compress(callback?: (status: number) => void): Promise<void> {
		let sizeSum = 0;
		let sizePos = 0;
		// Calculate total size for progress calculation if callback provided.
		if (callback) {
			for (const file of this.iterate()) {
				if (!file.bufferBr) sizeSum += file.bufferRaw.length;
			}
			callback(0);
		}
		// Compress files and update progress.
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

	/**
	 * Adds a file to the file system.
	 * 
	 * @param filename - The name of the file.
	 * @param modificationTime - The last modification time of the file.
	 * @param buffer - The raw buffer content of the file.
	 */
	public addFile(filename: string, modificationTime: number, buffer: Buffer): void {
		if (!filename) throw Error('filename is empty');
		this.files.set(filename, new File(filename, modificationTime, buffer));
	}

	/**
	 * Retrieves a file's raw buffer by its name.
	 * 
	 * @param filename - The name of the file to retrieve.
	 * @returns The raw buffer of the file or undefined if not found.
	 */
	public getFile(filename: string): Buffer | undefined {
		return this.files.get(filename)?.bufferRaw;
	}

	/**
	 * Creates a clone of the current FileSystem instance.
	 * 
	 * @returns A new FileSystem instance with a copy of the current files.
	 */
	public clone(): FileSystem {
		return new FileSystem(new Map(this.files));
	}

	/**
	 * Returns an iterator over the files in the system.
	 * 
	 * @returns An IterableIterator of File instances.
	 */
	public iterate(): IterableIterator<File> {
		return this.files.values();
	}

	/**
	 * Executes a callback for each file in the system that matches a given prefix.
	 * 
	 * @param prefix - The prefix to match files against.
	 * @param cb - The callback to execute for each matching file.
	 */
	public forEachFile(prefix: string, cb: ((filename: string, buffer: Buffer) => void)): void {
		for (const [name, file] of this.files.entries()) {
			if (!name.startsWith(prefix)) continue;
			cb(name, file.bufferRaw);
		}
	}
}
