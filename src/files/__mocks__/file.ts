import { jest } from '@jest/globals';
import type { File as FileType } from '../file';

const { File: OriginalFile } = await import('../file?' + Math.random()) as { File: typeof FileType };

const compressed = Buffer.from('compressed');

export class File extends OriginalFile {
	constructor(name: string, modificationTime: number, bufferRaw: Buffer) {
		super(name, modificationTime, bufferRaw);
	}
	public async compress(): Promise<void> {
		this.bufferBr = compressed;
	}
}

const mockedClass = {
	File
}

try { jest.unstable_mockModule('../file', () => mockedClass) } catch (_) { /* */ }
try { jest.unstable_mockModule('./file', () => mockedClass) } catch (_) { /* */ }
try { jest.unstable_mockModule('./files/file', () => mockedClass) } catch (_) { /* */ }
