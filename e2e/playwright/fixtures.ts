import { test as base } from '@playwright/test';
import { createReadStream, readFileSync, readdirSync, statSync } from 'fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { tmpdir } from 'os';
import { join, extname, resolve } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { lookup } from 'mrmime';

const releaseDir = resolve(import.meta.dirname, '../../release');

/** Recursively read all files in a directory into a map of relative path -> Buffer. */
function readDirRecursive(dir: string, prefix = ''): Map<string, Buffer> {
	const files = new Map<string, Buffer>();
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const relPath = prefix ? `${prefix}/${entry}` : entry;
		if (statSync(fullPath).isDirectory()) {
			for (const [k, v] of readDirRecursive(fullPath, relPath)) {
				files.set(k, v);
			}
		} else {
			files.set(relPath, readFileSync(fullPath));
		}
	}
	return files;
}

type WorkerFixtures = {
	bundleName: string;
	tileIndex: string[];
	tilesMeta: Record<string, object>;
	serverUrl: string;
};

export const test = base.extend<object, WorkerFixtures>({
	bundleName: ['', { option: true, scope: 'worker' }],
	tileIndex: [[], { option: true, scope: 'worker' }],
	tilesMeta: [{}, { option: true, scope: 'worker' }],

	serverUrl: [
		async ({ bundleName, tileIndex, tilesMeta }, use) => {
			const tmpDir = await mkdtemp(join(tmpdir(), 'pw-'));

			// Extract tar.gz and read files into memory
			await pipeline(
				createReadStream(join(releaseDir, `${bundleName}.tar.gz`)),
				createGunzip(),
				tar.x({ cwd: tmpDir })
			);
			const files = readDirRecursive(tmpDir);

			// Remove temp dir immediately — files are in memory
			void rm(tmpDir, { recursive: true, force: true });

			// Create server that serves static files and proxies /tiles/ requests
			const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
				const url = new URL(req.url ?? '/', 'http://localhost');
				let path = url.pathname;

				// Proxy: handle /tiles/ requests with mock data
				if (path.startsWith('/tiles/')) {
					if (path === '/tiles/index.json') {
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify(tileIndex));
						return;
					}

					const tilesJsonMatch = path.match(/^\/tiles\/([^/]+)\/tiles\.json$/);
					if (tilesJsonMatch) {
						const id = tilesJsonMatch[1];
						const meta = tilesMeta[id] ?? { name: id };
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify(meta));
						return;
					}

					res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
					res.end(Buffer.alloc(0));
					return;
				}

				// Static files: strip leading slash
				if (path === '/') path = '/index.html';
				const filePath = path.replace(/^\/+/, '');

				const content = files.get(filePath);
				if (content) {
					const mime = lookup(extname(filePath)) ?? 'application/octet-stream';
					res.writeHead(200, { 'Content-Type': mime });
					res.end(content);
					return;
				}

				// Try index.html for directories
				const indexPath = filePath.replace(/\/?$/, '/index.html');
				const indexContent = files.get(indexPath);
				if (indexContent) {
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(indexContent);
					return;
				}

				res.writeHead(404);
				res.end('Not Found');
			});

			const url = await new Promise<string>((res) => {
				server.listen(0, () => {
					const addr = server.address();
					if (typeof addr === 'object' && addr) {
						res(`http://localhost:${addr.port}`);
					}
				});
			});

			await use(url);

			// Cleanup
			server.closeAllConnections();
			server.close();
		},
		{ scope: 'worker' },
	],
});

export { expect } from '@playwright/test';
