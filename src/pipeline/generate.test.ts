import { vi, describe, it, expect } from 'vitest';
import type { FrontendConfig } from '../frontend/frontend';
import { FileDBs } from '../files/filedbs';

// The bundling itself is tested with Frontend; here only the orchestration around it counts.
vi.mock('../frontend/frontend', () => ({
	Frontend: vi.fn(function (this: Record<string, unknown>, _fileDBs: unknown, config: FrontendConfig) {
		this.config = config;
		this.saveAsTarGz = vi.fn(async () => {});
		this.saveAsBrTarGz = vi.fn(async () => {});
		this.saveAsTarZst = vi.fn(async () => {});
		this.iterate = function* () {};
	}),
}));

const { progress, PromiseFunction } = await import('../async_progress');
const { Frontend } = await import('../frontend/frontend');
const { generateFrontends } = await import('./generate');
const { ReleaseNotes } = await import('./release_notes');

progress.disable();

const configs: FrontendConfig[] = [
	{ name: 'first', description: 'The first frontend.', fileDBs: [] },
	{ name: 'second', description: 'The second frontend.', fileDBs: [] },
];

describe('generateFrontends', () => {
	it('saves every frontend in all three formats and adds them to the release notes', async () => {
		const notes = new ReleaseNotes();
		const append = vi.spyOn(notes, 'append');

		await PromiseFunction.run(generateFrontends(new FileDBs(), configs, '/tmp/dst', notes));

		const frontends = vi.mocked(Frontend).mock.instances as unknown as Record<string, ReturnType<typeof vi.fn>>[];
		expect(vi.mocked(Frontend).mock.calls.map((call) => call[1].name)).toStrictEqual(['first', 'second']);
		for (const frontend of frontends) {
			expect(frontend.saveAsTarGz).toHaveBeenCalledWith('/tmp/dst');
			expect(frontend.saveAsBrTarGz).toHaveBeenCalledWith('/tmp/dst');
			expect(frontend.saveAsTarZst).toHaveBeenCalledWith('/tmp/dst');
		}

		const appended = append.mock.calls.map(([text]) => text).join('');
		expect(appended).toContain('## Frontends\n\n- **first**: The first frontend.\n- **second**: The second frontend.');
		expect(appended).toContain('## Asset Overview');
	});
});
