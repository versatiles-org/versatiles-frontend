import { test as base } from '@playwright/test';
import { createReadStream } from 'fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { extname, resolve } from 'path';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Parser } from 'tar';
import { lookup } from 'mrmime';

const releaseDir = resolve(import.meta.dirname, '../../release');

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
			// Stream tar.gz entries directly into memory (no temp directory needed)
			const files = new Map<string, Buffer>();
			await pipeline(
				createReadStream(resolve(releaseDir, `${bundleName}.tar.gz`)),
				createGunzip(),
				new Parser({
					onReadEntry: (entry) => {
						if (entry.type === 'File') {
							const chunks: Buffer[] = [];
							entry.on('data', (chunk: Buffer) => chunks.push(chunk));
							entry.on('end', () => files.set(entry.path, Buffer.concat(chunks)));
						} else {
							entry.resume();
						}
					},
				})
			);

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
		{ scope: 'worker', timeout: 60_000 },
	],
});

export { expect } from '@playwright/test';
