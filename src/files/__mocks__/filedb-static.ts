import { vi } from 'vitest';
import type { StaticFileDB as StaticFileDBType, StaticFileDBConfig } from '../filedb-static';

export const StaticFileDB = vi.fn();

vi.mock('../filedb-static', async (importOriginal) => {
	const original = await importOriginal<typeof import('../filedb-static')>();
	const BaseStaticFileDB = original.StaticFileDB as typeof StaticFileDBType;

	class MockStaticFileDB extends BaseStaticFileDB {
		constructor() {
			super('');
		}

		public static async build(_config: StaticFileDBConfig, _frontendFolder: string): Promise<MockStaticFileDB> {
			return new MockStaticFileDB();
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	StaticFileDB.mockImplementation(() => {
		return new MockStaticFileDB();
	});
	// @ts-expect-error - override for testing
	StaticFileDB.build = vi.fn(MockStaticFileDB.build);

	return {
		...original,
		StaticFileDB,
	};
});
