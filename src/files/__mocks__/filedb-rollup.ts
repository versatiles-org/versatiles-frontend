import { vi } from 'vitest';
import type { RollupFileDB as RollupFileDBType, RollupFileDBConfig } from '../filedb-rollup';

vi.mock('../filedb-rollup', async (importOriginal) => {
	const original = await importOriginal<typeof import('../filedb-rollup')>();
	const BaseRollupFileDB = original.RollupFileDB as typeof RollupFileDBType;

	class RollupFileDB extends BaseRollupFileDB {
		public static async build(config: RollupFileDBConfig, frontendFolder: string): Promise<RollupFileDB> {
			return new RollupFileDB(config, frontendFolder);
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		RollupFileDB,
	};
});
