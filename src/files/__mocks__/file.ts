import { vi } from 'vitest';

vi.mock('../file', async originalImport => {
	const original = await originalImport<typeof import('../file')>();
	const BaseFile = original.File;

	class File extends BaseFile {
		constructor(name: string, modificationTime: number, bufferRaw: Buffer) {
			super(name, modificationTime, bufferRaw);
		}
		async compress(): Promise<void> {
			this.bufferBr = Buffer.from('compressed');
		}
	}

	return {
		...original,
		File,
	};
});