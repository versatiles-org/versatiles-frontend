import { forEachAsync } from '../utils/parallel';
import { File } from './file';

/**
 * A custom file system interface for storing and managing File instances.
 */
export abstract class FileDB {
	public readonly files = new Map<string, File>(); // A map to store File instances.

	public constructor() {
	}

	public abstract enterWatchMode(): void;

	/**
	 * Compresses all files in the system that are not already compressed, optionally reporting progress.
	 * 
	 * @param callback - Optional callback to report compression progress.
	 */
	public async compress(callback: (sizePos: number, sizeSum: number) => void): Promise<void> {
		let sizeSum = 0;
		let sizePos = 0;

		// Calculate total size for progress calculation if callback provided.
		for (const file of this.iterate()) {
			if (file.bufferBr) continue;
			sizeSum += file.bufferRaw.length;
		}
		callback(0, sizeSum);

		await forEachAsync(this.iterate(), async file => {
			if (file.bufferBr) return;
			await file.compress();
			sizePos += file.bufferRaw.length;
			callback(sizePos, sizeSum);
		});
		if (callback) callback(sizeSum, sizeSum);
	}

	/**
	 * Adds a file to the file system.
	 * 
	 * @param filename - The name of the file.
	 * @param modificationTime - The last modification time of the file.
	 * @param buffer - The raw buffer content of the file.
	 */
	public setFileFromBuffer(filename: string, modificationTime: number, buffer: Buffer): void {
		if (!filename) throw Error('filename is empty');
		this.files.set(filename, new File(filename, modificationTime, buffer));
	}

	public setFile(file: File): void {
		this.files.set(file.name, file);
	}

	/**
	 * Retrieves a file's raw buffer by its name.
	 * 
	 * @param filename - The name of the file to retrieve.
	 * @returns The raw buffer of the file or undefined if not found.
	 */
	public getFile(filename: string): Buffer | null {
		return this.files.get(filename)?.bufferRaw ?? null;
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
