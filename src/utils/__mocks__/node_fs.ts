import { tmpdir } from 'os';
import { resolve } from 'path';
import { vi } from 'vitest';

export const createWriteStream = vi.fn();

vi.mock('fs', async (originalImport) => {
	const originalFs = await originalImport<typeof import('fs')>();

	createWriteStream.mockImplementation(() => {
		const filename = resolve(tmpdir(), Math.random().toString(36) + '.tmp');
		const stream = originalFs.createWriteStream(filename);
		return stream;
	});

	return {
		createReadStream: vi.fn(),
		createWriteStream,
		mkdirSync: vi.fn(),
		existsSync: vi.fn(),
		rmSync: vi.fn(),
	};
});
