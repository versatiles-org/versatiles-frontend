import { vi } from 'vitest';
import type { ExternalFileDB as ExternalFileDBType, ExternalFileDBConfig } from '../filedb-external';

vi.mock('../filedb-external', async (importOriginal) => {
	const original = await importOriginal<typeof import('../filedb-external')>();
	const BaseExternalFileDB = original.ExternalFileDB as typeof ExternalFileDBType;

	class ExternalFileDB extends BaseExternalFileDB {
		constructor() {
			super();
		}

		public static async build(_config: ExternalFileDBConfig): Promise<ExternalFileDB> {
			return new ExternalFileDB();
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		ExternalFileDB,
	};
});
