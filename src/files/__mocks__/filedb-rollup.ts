import { jest } from '@jest/globals';
import type { RollupFileDB as RollupFileDBType, RollupFileDBConfig } from '../filedb-rollup';
const { RollupFileDB: OriginalRollupFileDB } = await import('../filedb-rollup?' + Math.random()) as { RollupFileDB: typeof RollupFileDBType };

export class RollupFileDB extends OriginalRollupFileDB {
	public static async build(_config: RollupFileDBConfig, _frontendFolder: string): Promise<RollupFileDB> {
		return new RollupFileDB(_config, _frontendFolder);
	}
	public enterWatchMode(): void {
	}
}

const mockedModule = {
	RollupFileDB
}

try { jest.unstable_mockModule('../filedb-rollup', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./filedb-rollup', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./files/filedb-rollup', () => mockedModule) } catch (_) { /* */ }
