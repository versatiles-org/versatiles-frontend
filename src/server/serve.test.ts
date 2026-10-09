import { describe, it, expect, afterEach } from 'vitest';
import { FileDB } from '../files/filedb';
import { FileDBs } from '../files/filedbs';
import type { FrontendConfig } from '../frontend/frontend';
import { serveFrontends, type Serving } from './serve';

class TestFileDB extends FileDB {
	public enterWatchMode(): void {}
}

function createFileDBs(): FileDBs {
	const fileDBs = new FileDBs();
	for (const name of ['a', 'b']) {
		const db = new TestFileDB();
		db.setFileFromBuffer('index.html', Buffer.from(`page of ${name}`));
		fileDBs.set(name, db);
	}
	return fileDBs;
}

const configs: FrontendConfig[] = [
	{ name: 'frontend-b', description: 'The frontend of b.', fileDBs: ['b'] },
	{ name: 'frontend-a', description: 'The frontend of a.', fileDBs: ['a'] },
];

describe('serveFrontends', () => {
	let serving: Serving | undefined;

	afterEach(async () => {
		await serving?.stop();
		serving = undefined;
	});

	it('serves each frontend on a port of its own, in the order of the configs', async () => {
		serving = await serveFrontends(createFileDBs(), configs, { host: '127.0.0.1', port: 0 });

		expect(serving.entries.map((entry) => entry.name)).toStrictEqual(['frontend-b', 'frontend-a']);
		const [b, a] = serving.entries;
		expect(a.port).not.toBe(b.port);
		expect(await (await fetch(`http://localhost:${a.port}/`)).text()).toBe('page of a');
		expect(await (await fetch(`http://localhost:${b.port}/`)).text()).toBe('page of b');
	});

	it('starts a landing page that links to every frontend', async () => {
		serving = await serveFrontends(createFileDBs(), configs, { host: '127.0.0.1', port: 0 });

		const html = await (await fetch(`http://localhost:${serving.landingPort}/`)).text();
		for (const entry of serving.entries) {
			expect(html).toContain(`http://localhost:${entry.port}/`);
			expect(html).toContain(entry.description);
		}
	});

	it('stops every server', async () => {
		serving = await serveFrontends(createFileDBs(), configs, { host: '127.0.0.1', port: 0 });
		const ports = [serving.landingPort, ...serving.entries.map((entry) => entry.port)];

		await serving.stop();
		serving = undefined;

		for (const port of ports) {
			await expect(fetch(`http://localhost:${port}/`)).rejects.toThrow();
		}
	});
});
