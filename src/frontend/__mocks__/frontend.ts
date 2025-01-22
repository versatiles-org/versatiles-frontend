import { jest } from '@jest/globals';
import type { FileDBs } from '../../files/filedbs';
import type { FrontendConfig } from '../frontend';

const { Frontend: OriginalFrontend } = await import('../../frontend/frontend?' + Math.random()) as typeof import('../../frontend/frontend');

class MockedFrontend extends OriginalFrontend {
	constructor(fileDBs: FileDBs, config: FrontendConfig) {
		super(fileDBs, config);
	}
	async saveAsTarGz() { }
	async saveAsBrTarGz() { }
}

export const Frontend = jest.fn(
	(fileDBs: FileDBs, config: FrontendConfig) => {
		return jest.mocked(new MockedFrontend(fileDBs, config))
	}
);

const mockedModule = {
	Frontend,
}

try { jest.unstable_mockModule('./frontend', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../frontend', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./frontend/frontend', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../frontend/frontend', () => mockedModule) } catch (_) { /* */ }
