import { File } from './file';
import { jest } from '@jest/globals';

import type { FileDB as FileDBType } from '../filedb';
const { FileDB: OriginalFileDB } = await import('../filedb?' + Math.random()) as { FileDB: typeof FileDBType };

export class FileDB extends OriginalFileDB {
	constructor(testFiles?: Record<string, string>) {
		super();
		if (testFiles) {
			Object.entries(testFiles).forEach(([name, content]) => {
				this.files.set(name, new File(name, 12345, Buffer.from(content)));
			});
		}
	}
	public enterWatchMode(): void {
	}
}

const mockedModule = {
	FileDB
}

try { jest.unstable_mockModule('../filedb', () => mockedModule) } catch (e) { }
try { jest.unstable_mockModule('./filedb', () => mockedModule)} catch (e) { }
try { jest.unstable_mockModule('./files/filedb', () => mockedModule)} catch (e) { }
