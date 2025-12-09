import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { RollupFileDBConfig } from './filedb-rollup';
import { FileDB } from './filedb';
import { RollupFileDB } from './filedb-rollup';

vi.mock('rollup', () => ({
	rollup: vi.fn(() => ({
		generate: vi.fn(() => ({ output: [{ fileName: 'test.js', code: 'console.log("test")' }] })),
	})),
}));

vi.mock('fs', () => ({
	existsSync: vi.fn(() => true),
	watch: vi.fn(),
	mkdirSync: vi.fn(),
}));

describe('RollupFileDB', () => {
	const mockConfig: RollupFileDBConfig = {
		type: 'rollup',
		path: 'style-selector',
		url: 'assets/lib/style-selector/style-selector.js',
		globalVariable: 'StyleSelector',
	};
	const frontendFolder = new URL('../../frontends', import.meta.url).pathname;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should rollup files', async () => {
		const filedbs = await RollupFileDB.build(mockConfig, frontendFolder);
		expect(filedbs).toBeInstanceOf(FileDB);
		const files = Array.from(filedbs.iterate())
			.map((file) => file.name)
			.sort();
		expect(files).toStrictEqual(['assets/lib/style-selector/test.js']);
	});
});
