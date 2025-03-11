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
	 * @param cbProgress - Optional callback to report compression progress.
	 */
	public async compress(cbProgress: (sizePos: number, sizeSum: number) => void): Promise<void> {

		const files = Array.from(this.iterate().filter(file => file.bufferBr == null));

		// Calculate total size for progress calculation if callback provided.
		const sizeSum = files.reduce((s, f) => s + f.bufferRaw.length, 0);
		cbProgress(0, sizeSum);

		let sizePos = 0;
		await forEachAsync(files, async file => {
			await file.compress();
			sizePos += file.bufferRaw.length;
			cbProgress(sizePos, sizeSum);
		});
		cbProgress(sizeSum, sizeSum);
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
	public iterate(): MapIterator<File> {
		return this.files.values();
	}
}
