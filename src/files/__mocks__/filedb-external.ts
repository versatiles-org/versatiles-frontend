import { jest } from '@jest/globals';
import type { ExternalFileDB as ExternalFileDBType, ExternalFileDBConfig } from '../filedb-external';
const { ExternalFileDB: OriginalExternalFileDB } = await import('../filedb-external?' + Math.random()) as { ExternalFileDB: typeof ExternalFileDBType };

export class ExternalFileDB extends OriginalExternalFileDB {
	constructor() {
		super();
	}
	public static async build(_config: ExternalFileDBConfig): Promise<ExternalFileDB> {
		return new ExternalFileDB()
	}
	public enterWatchMode(): void {
	}
}

const mockedClass = {
	ExternalFileDB
}

try { jest.unstable_mockModule('../filedb-external', () => mockedClass) } catch (_) { /* */ }
try { jest.unstable_mockModule('./filedb-external', () => mockedClass) } catch (_) { /* */ }
try { jest.unstable_mockModule('./files/filedb-external', () => mockedClass) } catch (_) { /* */ }

