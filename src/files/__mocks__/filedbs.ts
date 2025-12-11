import { vi } from 'vitest';
import { FileDB } from '../filedb';

export const FileDBs = vi.fn();

vi.mock('../filedbs', async (importOriginal) => {
	const original = await importOriginal<typeof import('../filedbs')>();
	const BaseFileDBs = original.FileDBs;

	class MockFileDBs extends BaseFileDBs {
		constructor(testFileDBs?: Record<string, Record<string, string>>) {
			super();
			if (testFileDBs) {
				Object.entries(testFileDBs).forEach(([name, testFiles]) => {
					// @ts-expect-error - override for testing
					this.fileDBs.set(name, new FileDB(testFiles));
				});
			}
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	FileDBs.mockImplementation(function (testFileDBs?: Record<string, Record<string, string>>) {
		return new MockFileDBs(testFileDBs);
	});

	// Wrap the original loader functions in vi.fn so tests can assert on calls
	const loadFileDBConfigs = vi.fn(original.loadFileDBConfigs);
	const loadFileDBs = vi.fn(original.loadFileDBs);

	return {
		...original,
		FileDBs,
		loadFileDBConfigs,
		loadFileDBs,
	};
});
