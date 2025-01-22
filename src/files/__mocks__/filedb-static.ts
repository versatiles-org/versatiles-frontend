import { jest } from '@jest/globals';
import type { StaticFileDB as StaticFileDBType,StaticFileDBConfig } from '../filedb-static';
const { StaticFileDB: OriginalStaticFileDB } = await import('../filedb-static?' + Math.random()) as { StaticFileDB: typeof StaticFileDBType };

export class StaticFileDB extends OriginalStaticFileDB {
	constructor() {
		super('');
	}
	public static async build(config: StaticFileDBConfig, frontendFolder: string): Promise<StaticFileDB> {
		return new StaticFileDB()
	}
	public enterWatchMode(): void {
	}
}

const mockedModule = {
	StaticFileDB
}

try { jest.unstable_mockModule('../filedb-static', () => mockedModule) } catch (e) { }
try { jest.unstable_mockModule('./filedb-static', () => mockedModule)} catch (e) { }
try { jest.unstable_mockModule('./files/filedb-static', () => mockedModule)} catch (e) { }
