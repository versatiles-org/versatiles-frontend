import { vi } from 'vitest';
import './file';
import { File } from '../file';

vi.mock('../filedb', async importOriginal => {
	const original = await importOriginal<typeof import('../filedb')>();
	const BaseFileDB = original.FileDB;

	class FileDB extends BaseFileDB {
		constructor(testFiles?: Record<string, string>) {
			super();
			if (testFiles) {
				Object.entries(testFiles).forEach(([name, content]) => {
					this.files.set(name, new File(name, 12345, Buffer.from(content)));
				});
			}
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		FileDB,
	};
});
