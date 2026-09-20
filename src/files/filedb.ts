import { forEachAsync } from '../utils/parallel';
import { File } from './file';

/**
 * A custom file system interface for storing and managing File instances.
 */
export abstract class FileDB {
	public readonly files = new Map<string, File>(); // A map to store File instances.

	public constructor() {}

	public abstract enterWatchMode(): void;

	/**
	 * Compresses all files in the system that are not already compressed, optionally reporting progress.
	 *
	 * @param cbProgress - Optional callback to report compression progress.
	 */
	public async compress(cbProgress: (sizePos: number, sizeSum: number) => void): Promise<void> {
		const files = Array.from(this.iterate().filter((file) => file.bufferBr == null));

		// Compress each distinct content once. Grouping by content hash rather than by buffer
		// identity matters: identity only catches files resolved from the same tar link, while
		// duplicate content under unrelated names is the common case here - a fonts bundle
		// repeats one empty glyph range under tens of thousands of names.
		const groups = new Map<string, File[]>();
		for (const file of files) {
			const group = groups.get(file.contentHash);
			if (group) group.push(file);
			else groups.set(file.contentHash, [file]);
		}

		// Calculate total size for progress calculation if callback provided.
		const sizeSum = files.reduce((s, f) => s + f.bufferRaw.length, 0);
		cbProgress(0, sizeSum);

		let sizePos = 0;
		await forEachAsync(groups.values(), async (group) => {
			const bufferBr = await group[0].compress();
			// The rest of the group is byte-identical, so it shares the result verbatim.
			for (const file of group) file.bufferBr = bufferBr;
			sizePos += group[0].bufferRaw.length * group.length;
			cbProgress(sizePos, sizeSum);
		});
		cbProgress(sizeSum, sizeSum);
	}

	/**
	 * Adds a file to the file system.
	 *
	 * @param filename - The name of the file.
	 * @param buffer - The raw buffer content of the file.
	 */
	public setFileFromBuffer(filename: string, buffer: Buffer): void {
		if (!filename) throw Error('filename is empty');
		this.files.set(filename, new File(filename, buffer));
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
