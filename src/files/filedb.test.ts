import { describe, expect, it, vi } from 'vitest';
import { FileDB } from './filedb';
import { File } from './file';

// Brotli compression is exercised by file.test.ts; here it only needs to be observable.
vi.mock('./file', async (importOriginal) => {
	const original = (await importOriginal()) as typeof import('./file');
	class MockFile extends original.File {
		public compressCalls = 0;
		public override async compress(): Promise<Buffer> {
			this.compressCalls++;
			this.bufferBr = Buffer.from(`br:${this.name}`);
			return this.bufferBr;
		}
	}
	return { ...original, File: MockFile };
});

class TestFileDB extends FileDB {
	public enterWatchMode(): void {}
}

function createDB(sizes: Record<string, number>): TestFileDB {
	const db = new TestFileDB();
	for (const [name, size] of Object.entries(sizes)) db.setFileFromBuffer(name, Buffer.alloc(size, 1));
	return db;
}

describe('FileDB.compress', () => {
	it('compresses every file that is not compressed yet', async () => {
		const db = createDB({ 'a.txt': 10, 'b.txt': 20 });

		await db.compress(() => undefined);

		for (const file of db.iterate()) expect(file.bufferBr).toBeDefined();
	});

	it('reports progress from zero to the total size', async () => {
		const db = createDB({ 'a.txt': 10, 'b.txt': 20, 'c.txt': 30 });
		const calls: [number, number][] = [];

		await db.compress((sizePos, sizeSum) => calls.push([sizePos, sizeSum]));

		// Starts at zero and ends at the total; every report uses the same total.
		expect(calls[0]).toStrictEqual([0, 60]);
		expect(calls[calls.length - 1]).toStrictEqual([60, 60]);
		expect(calls.every(([, sizeSum]) => sizeSum === 60)).toBe(true);
		// Progress accumulates the raw size of each file, so it never moves backwards.
		const positions = calls.map(([sizePos]) => sizePos);
		expect(positions).toStrictEqual([...positions].sort((a, b) => a - b));
		// It also has to move *during* the run: the final call reports the total either way,
		// so without this a progress bar stuck at zero would still pass.
		expect(positions.filter((sizePos) => sizePos > 0 && sizePos < 60)).not.toStrictEqual([]);
		// One report per file, plus the initial zero and the final total.
		expect(calls).toHaveLength(5);
	});

	it('skips files that already carry a compressed buffer', async () => {
		const db = createDB({ 'fresh.txt': 10 });
		const done = new File('done.txt', Buffer.alloc(20, 1));
		done.bufferBr = Buffer.from('already');
		db.files.set(done.name, done);

		const calls: [number, number][] = [];
		await db.compress((sizePos, sizeSum) => calls.push([sizePos, sizeSum]));

		// The pre-compressed file counts towards neither the total nor the progress.
		expect(calls[0]).toStrictEqual([0, 10]);
		expect(done.bufferBr).toStrictEqual(Buffer.from('already'));
	});

	it('reports a total of zero when there is nothing to compress', async () => {
		const db = createDB({});
		const calls: [number, number][] = [];

		await db.compress((sizePos, sizeSum) => calls.push([sizePos, sizeSum]));

		expect(calls).toStrictEqual([
			[0, 0],
			[0, 0],
		]);
	});
});
