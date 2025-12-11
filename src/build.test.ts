import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ProgressLabel as ProgressLabelType, Progress as ProgressType } from './async_progress/progress';

// Mock progress module
vi.mock('./async_progress/progress', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('./async_progress/progress');
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

// Mock release_version module
vi.mock('./utils/release_version', () => ({
	getLatestGithubReleaseVersion: vi.fn<(owner: string, repo: string, allowPrerelease?: boolean) => Promise<string>>(
		async () => '1.2.3'
	),
	getLatestNPMReleaseVersion: vi.fn<(packageName: string) => Promise<string>>(async () => '2.3.4'),
}));

// Mock release_notes module
const releaseNotesMock = {
	add: vi.fn(),
	setVersion: vi.fn(),
	save: vi.fn(),
	labelList: [],
	labelMap: new Map(),
};
vi.mock('./utils/release_notes', () => ({ default: releaseNotesMock }));

// Mock utils module
const cleanupFolder = vi.fn().mockReturnValue(undefined);
const ensureFolder = vi.fn().mockReturnValue(undefined);
vi.mock('./utils/utils', () => ({
	cleanupFolder,
	ensureFolder,
}));

// Mock StaticFileDB
vi.mock('./files/filedb-static', async (importOriginal) => {
	const original = await importOriginal<typeof import('./files/filedb-static')>();
	const BaseStaticFileDB = original.StaticFileDB;

	class MockStaticFileDB extends BaseStaticFileDB {
		constructor() {
			super('');
		}

		public static async build(_config: unknown, _frontendFolder: string): Promise<MockStaticFileDB> {
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

// Mock RollupFileDB
vi.mock('./files/filedb-rollup', async (importOriginal) => {
	const original = await importOriginal<typeof import('./files/filedb-rollup')>();
	const BaseRollupFileDB = original.RollupFileDB;

	class RollupFileDB extends BaseRollupFileDB {
		public static async build(config: unknown, frontendFolder: string): Promise<RollupFileDB> {
			return new RollupFileDB(config, frontendFolder);
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		RollupFileDB,
	};
});

// Mock ExternalFileDB
vi.mock('./files/filedb-external', async (importOriginal) => {
	const original = await importOriginal<typeof import('./files/filedb-external')>();
	const BaseExternalFileDB = original.ExternalFileDB;

	class ExternalFileDB extends BaseExternalFileDB {
		constructor() {
			super();
		}

		public static async build(_config: unknown): Promise<ExternalFileDB> {
			return new ExternalFileDB();
		}

		public enterWatchMode(): void {
			// no-op in tests
		}
	}

	return {
		...original,
		ExternalFileDB,
	};
});

// Mock Frontend
vi.mock('./frontend/frontend', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('./frontend/frontend');
	const OriginalFrontend = originalModule.Frontend;
	type FileDBs = Parameters<typeof OriginalFrontend>[0];
	type FrontendConfig = Parameters<typeof OriginalFrontend>[1];

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
	}

	const Frontend = vi.fn(function (fileDBs: FileDBs, config: FrontendConfig) {
		return vi.mocked(new MockedFrontend(fileDBs, config));
	});

	return {
		...originalModule,
		Frontend,
	};
});

import { Progress } from './async_progress';
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
		]);

		// Confirm that release notes are saved
		expect(releaseNotesMock.save).toHaveBeenCalledWith(expect.any(String));
	});
});
