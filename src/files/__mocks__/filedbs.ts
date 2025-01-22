import { jest } from '@jest/globals';
import { FileDB } from './filedb';

const originalModule = await import('../filedbs?' + Math.random()) as typeof import('../filedbs');;

export class FileDBs extends originalModule.FileDBs {
	constructor(testFileDBs?: Record<string, Record<string, string>>) {
		super();
		if (testFileDBs) {
			Object.entries(testFileDBs).forEach(([name, testFiles]) => {
				this.fileDBs.set(name, new FileDB(testFiles));
			});
		}
	}
	public enterWatchMode(): void {
	}
}

export const loadFileDBConfigs = jest.mocked(originalModule.loadFileDBConfigs);
export const loadFileDBs = jest.mocked(originalModule.loadFileDBs);

const mockedModule = { FileDBs, loadFileDBConfigs, loadFileDBs }

try { jest.unstable_mockModule('../filedbs', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./filedbs', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./files/filedbs', () => mockedModule) } catch (_) { /* */ }
