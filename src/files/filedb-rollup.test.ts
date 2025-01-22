import { jest } from '@jest/globals';
import type { RollupFileDBConfig } from './filedb-rollup';
import { FileDB } from './filedb';
import { RollupFileDB } from './filedb-rollup';

jest.mock('rollup', () => ({
	rollup: jest.fn(() => ({
		generate: jest.fn(() => ({ output: [{ fileName: 'test.js', code: 'console.log("test")' }] })),
	})),
}));

jest.mock('node:fs', () => ({
	existsSync: jest.fn(() => true),
	watch: jest.fn(),
}));

describe('RollupFileDB', () => {
	const mockConfig: RollupFileDBConfig = {
		type: 'rollup',
		path: 'style-selector',
		url: 'assets/lib/style-selector/style-selector.js',
		globalVariable: 'StyleSelector'
	};
	const frontendFolder = new URL('../../frontends', import.meta.url).pathname;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should rollup files', async () => {
		const filedbs = await RollupFileDB.build(mockConfig, frontendFolder);
		expect(filedbs).toBeInstanceOf(FileDB);
		const files = Array.from(filedbs.iterate()).map(file => file.name).sort();
		expect(files).toStrictEqual([
			'assets/lib/style-selector/style-selector.css',
			'assets/lib/style-selector/style-selector.js',
			'assets/lib/style-selector/style-selector.js.map',
		]);
	});
});
