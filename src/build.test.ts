import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from './async-progress/progress';

// Mock progress module
vi.mock('./async-progress/progress', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('./async-progress/progress');
	originalModule.default.disable();

	function mockProgressLabel(progressLabel: ProgressLabelType) {
		vi.spyOn(progressLabel, 'updateLabel');
		vi.spyOn(progressLabel, 'start');
		vi.spyOn(progressLabel, 'end');
		vi.spyOn(progressLabel, 'getOutputAnsi');
		vi.spyOn(progressLabel, 'getOutputText');
	}

	class ProgressLabel extends originalModule.ProgressLabel {
		constructor(progress: ProgressType, label: string, indent: number) {
			super(progress, label, indent);
			mockProgressLabel(this);
		}
	}

	class Progress extends originalModule.Progress {
		constructor() {
			super();

			// Wrap the original add method so we can spy on the returned ProgressLabel as well
			const originalAdd = this.add.bind(this);
			this.add = ((name: string, indent = 0): ProgressLabelType => {
				const progressLabel = originalAdd(name, indent);
				mockProgressLabel(progressLabel);
				return progressLabel;
			}) as ProgressType['add'];
		}
	}

	const progress = new Progress();
	vi.spyOn(progress, 'add');
	vi.spyOn(progress, 'disable');
	vi.spyOn(progress, 'finish');
	vi.spyOn(progress, 'redraw');
	vi.spyOn(progress, 'setAnsi');
	vi.spyOn(progress, 'setHeader');
	vi.spyOn(progress, 'write');

	return {
		Progress: vi.fn(function () {
			return progress;
		}),
		default: progress,
		ProgressLabel,
	};
});

// Mock cache module
vi.mock('./utils/cache', () => ({
	cache: vi.fn(async (_action: string, _key: string, cbBuffer: () => Promise<Buffer>) => cbBuffer()),
}));

// Mock release-version module
vi.mock('./sources/github-release', () => ({
	getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(
		async () => '1.2.3'
	),
}));

// Mock the release notes: build.ts creates one instance, which these methods stand in for.
// Declared through vi.hoisted, because the hoisted factory below refers to it.
const releaseNotesMock = vi.hoisted(() => ({
	add: vi.fn((_source: { name: string; url: string }) => ({ setVersion: vi.fn() })),
	append: vi.fn(),
	setVersion: vi.fn(),
	save: vi.fn(),
}));
vi.mock('./pipeline/release-notes', () => ({
	ReleaseNotes: vi.fn(function () {
		return releaseNotesMock;
	}),
}));

// Mock utils module
const { cleanupFolder, ensureFolder } = vi.hoisted(() => ({
	cleanupFolder: vi.fn().mockReturnValue(undefined),
	ensureFolder: vi.fn().mockReturnValue(undefined),
}));
vi.mock('./utils/folders', () => ({
	cleanupFolder,
	ensureFolder,
}));

// Mock StaticFileDB
vi.mock('./sources/static', async (importOriginal) => {
	const original = await importOriginal<typeof import('./sources/static')>();
	const BaseStaticFileDB = original.StaticFileDB;

	class MockStaticFileDB extends BaseStaticFileDB {
		constructor() {
			super('');
		}

		public static async build(_config: unknown, _staticFolder: string): Promise<MockStaticFileDB> {
			return new MockStaticFileDB();
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	const StaticFileDB = vi.fn(() => new MockStaticFileDB());
	// @ts-expect-error - override for testing
	StaticFileDB.build = vi.fn(MockStaticFileDB.build);

	return {
		...original,
		StaticFileDB,
	};
});

// Mock GithubFileDB
vi.mock('./sources/github', async (importOriginal) => {
	const original = await importOriginal<typeof import('./sources/github')>();
	const BaseGithubFileDB = original.GithubFileDB;

	class GithubFileDB extends BaseGithubFileDB {
		constructor() {
			super();
		}

		// Keeps the source of the config, like the real one, so the release notes can list it.
		public static async build(config: { source?: { name: string; url: string } }): Promise<GithubFileDB> {
			const db = new GithubFileDB();
			db.source = config.source;
			return db;
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		GithubFileDB,
	};
});

// Mock NpmFileDB
vi.mock('./sources/npm', async (importOriginal) => {
	const original = await importOriginal<typeof import('./sources/npm')>();
	const BaseNpmFileDB = original.NpmFileDB;

	class NpmFileDB extends BaseNpmFileDB {
		constructor() {
			super();
		}

		public static async build(config: { source: { name: string; url: string } }): Promise<NpmFileDB> {
			const db = new NpmFileDB();
			db.source = config.source;
			return db;
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		NpmFileDB,
	};
});

// Mock Frontend
vi.mock('./frontend/frontend', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('./frontend/frontend');
	const OriginalFrontend = originalModule.Frontend;
	type FileDBs = ConstructorParameters<typeof OriginalFrontend>[0];
	type FrontendConfig = ConstructorParameters<typeof OriginalFrontend>[1];

	class MockedFrontend extends OriginalFrontend {
		constructor(fileDBs: FileDBs, config: FrontendConfig) {
			super(fileDBs, config);
		}
		async saveAsTarGz() {
			// no-op in tests
		}
		async saveAsBrTarGz() {
			// no-op in tests
		}
		async saveAsTarZst() {
			// no-op in tests
		}
	}

	const Frontend = vi.fn(function (fileDBs: FileDBs, config: FrontendConfig) {
		return vi.mocked(new MockedFrontend(fileDBs, config));
	});

	return {
		...originalModule,
		Frontend,
	};
});

import { Progress } from './async-progress';
const { Frontend } = await import('./frontend/frontend');

describe('Build Process', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('executes the build process correctly', async () => {
		const progress = new Progress();
		progress.disable();

		await import('./build');

		// Validate the cleanup of the destination folder
		expect(cleanupFolder).toHaveBeenCalledWith(expect.any(String));

		// Ensure progress tracking is properly set up and concluded
		expect(progress.setHeader).toHaveBeenCalledWith('Building Release');
		expect(progress.finish).toHaveBeenCalled();
		expect(vi.mocked(Frontend).mock.calls.map((call) => call[1].name)).toEqual([
			'frontend',
			'frontend-dev',
			'frontend-min',
			'frontend-blank',
			'frontend-tiny',
		]);

		// The release notes list the sources in the order of the configuration.
		const { sourceConfigs } = await import('./config');
		const sources = Object.values(sourceConfigs).flatMap((config) =>
			'source' in config && config.source ? [config.source.name] : []
		);
		expect(releaseNotesMock.add.mock.calls.map(([source]) => source.name)).toStrictEqual(sources);

		// Confirm that release notes are saved
		expect(releaseNotesMock.save).toHaveBeenCalledWith(expect.any(String));
	});
});
