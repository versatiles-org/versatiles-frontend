
import { readdir, rm, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

export async function cleanupFolder(path: string): Promise<void> {
	if (existsSync(path)) await rm(path, { recursive: true, maxRetries: 3, retryDelay: 100 });
	ensureFolder(path);
}

export async function copyRecursive(pathSrc: string, pathDst: string): Promise<void> {
	await copy('');

	async function copy(fol: string): Promise<void> {
		const folSrc = resolve(pathSrc, fol);
		const folDst = resolve(pathDst, fol);
		if ((await stat(folSrc)).isDirectory()) {
			ensureFolder(folDst);
			for (const entry of await readdir(folSrc)) {
				if (entry.startsWith('.')) continue;
				await copy(join(fol, entry));
			}
		} else {
			await pipeline(
				createReadStream(folSrc),
				createWriteStream(folDst),
			);
		}
	}
}

export function ensureFolder(path: string): void {
	if (existsSync(path)) return;
	ensureFolder(dirname(path));
	mkdirSync(path);
}

export async function streamAsBuffer(stream: Readable): Promise<Buffer> {
	return new Promise(res => {
		const buffers: Buffer[] = [];
		stream.on('data', (chunk: Buffer) => buffers.push(chunk));
		stream.on('end', () => {
			res(Buffer.concat(buffers));
		});
	});
}

export async function getLatestReleaseVersion(owner: string, repo: string): Promise<string> {
	const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
	const response = await fetch(url, { redirect: 'follow' });
	const data = await response.json();
	if (!Array.isArray(data)) {
		console.log({ data });
		throw Error('wrong response');
	}
	for (const entry of data) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const name = String(entry.tag_name);
		if (name.startsWith('v')) return name.slice(1);
	}
	throw Error(`Could not fetch the version of the latest release: https://github.com/${owner}/${repo}/releases`);
}
