import { vi } from 'vitest';
import type { FileDBs } from '../../files/filedbs';
import type { FrontendConfig } from '../frontend';

vi.mock('../frontend', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('../frontend');
	const OriginalFrontend = originalModule.Frontend;

	class MockedFrontend extends OriginalFrontend {
		constructor(fileDBs: FileDBs, config: FrontendConfig) {
			super(fileDBs, config);
		}
		async saveAsTarGz() {}
		async saveAsBrTarGz() {}
	}

	const Frontend = vi.fn(function (fileDBs: FileDBs, config: FrontendConfig) {
		return vi.mocked(new MockedFrontend(fileDBs, config));
	});

	return {
		...(await originalImport()),
		Frontend,
	};
});
