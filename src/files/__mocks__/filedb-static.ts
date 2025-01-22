import { jest } from '@jest/globals';
import type { StaticFileDB as StaticFileDBType,StaticFileDBConfig } from '../filedb-static';
const { StaticFileDB: OriginalStaticFileDB } = await import('../filedb-static?' + Math.random()) as { StaticFileDB: typeof StaticFileDBType };

export class StaticFileDB extends OriginalStaticFileDB {
	constructor() {
		super('');
	}
	public static async build(_config: StaticFileDBConfig, _frontendFolder: string): Promise<StaticFileDB> {
		return new StaticFileDB()
	}
	public enterWatchMode(): void {
	}
}

const mockedModule = {
	StaticFileDB
}

try { jest.unstable_mockModule('../filedb-static', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./filedb-static', () => mockedModule)} catch (_) { /* */ }
try { jest.unstable_mockModule('./files/filedb-static', () => mockedModule)} catch (_) { /* */ }
