import { describe, it, expect, vi, afterEach } from 'vitest';
import { FileDB, FileDBs } from '../sources';
import { getCommit, versionFile, VERSION_FILENAME } from './version-file';

class TestFileDB extends FileDB {
	public constructor(source?: { name: string; url: string }, version = '') {
		super();
		this.source = source;
		this.version = version;
	}

	public enterWatchMode(): void {}
}

const build = { version: '3.19.0', commit: '0123abc', built: '2026-11-23T10:00:00.000Z' };

function fileDBs(): FileDBs {
	const dbs = new FileDBs();
	dbs.set('all', new TestFileDB());
	dbs.set('fonts', new TestFileDB({ name: 'VersaTiles Fonts', url: 'https://example.org/fonts' }, '3.0.0'));
	dbs.set('fonts-noto', new TestFileDB({ name: 'VersaTiles Fonts', url: 'https://example.org/fonts' }, '3.0.0'));
	dbs.set('maplibre', new TestFileDB({ name: 'MapLibre GL JS', url: 'https://example.org/maplibre' }, '6.19.0'));
	return dbs;
}

describe('versionFile', () => {
	it('names the build and the components of the frontend, once each', () => {
		const config = { name: 'tiny', description: '', fileDBs: ['all', 'fonts', 'fonts-noto', 'maplibre'] };
		const file = versionFile(config, fileDBs(), build);

		expect(file.name).toBe(VERSION_FILENAME);
		expect(JSON.parse(file.bufferRaw.toString())).toStrictEqual({
			name: 'VersaTiles Frontend',
			frontend: 'tiny',
			version: '3.19.0',
			commit: '0123abc',
			built: '2026-11-23T10:00:00.000Z',
			components: { 'VersaTiles Fonts': '3.0.0', 'MapLibre GL JS': '6.19.0' },
		});
	});

	it('lists only the components of the frontend', () => {
		const config = { name: 'blank', description: '', fileDBs: ['fonts'] };
		const info = JSON.parse(versionFile(config, fileDBs(), build).bufferRaw.toString()) as Record<string, unknown>;
		expect(info.components).toStrictEqual({ 'VersaTiles Fonts': '3.0.0' });
	});
});

describe('getCommit', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('takes the commit of GitHub Actions', () => {
		vi.stubEnv('GITHUB_SHA', 'f00ba4');
		expect(getCommit(import.meta.dirname)).toBe('f00ba4');
	});

	it('reads the checked-out commit otherwise', () => {
		vi.stubEnv('GITHUB_SHA', '');
		expect(getCommit(import.meta.dirname)).toMatch(/^[0-9a-f]{40}$/);
	});

	it('is null outside of a git checkout', () => {
		vi.stubEnv('GITHUB_SHA', '');
		expect(getCommit('/')).toBeNull();
	});
});
