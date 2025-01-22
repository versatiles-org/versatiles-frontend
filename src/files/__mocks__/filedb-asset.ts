import { jest } from '@jest/globals';
import type { AssetFileDB as AssetFileDBType, AssetFileDBConfig } from '../filedb-asset';
const { AssetFileDB: OriginalAssetFileDB } = await import('../filedb-asset?' + Math.random()) as { AssetFileDB: typeof AssetFileDBType };

export class AssetFileDB extends OriginalAssetFileDB {
	constructor() {
		super();
	}
	public static async build(config: AssetFileDBConfig): Promise<AssetFileDB> {
		return new AssetFileDB()
	}
	public enterWatchMode(): void {
	}
}

const mockedClass = {
	AssetFileDB
}

try { jest.unstable_mockModule('../filedb-asset', () => mockedClass) } catch (e) { }
try { jest.unstable_mockModule('./filedb-asset', () => mockedClass) } catch (e) { }
try { jest.unstable_mockModule('./files/filedb-asset', () => mockedClass) } catch (e) { }

