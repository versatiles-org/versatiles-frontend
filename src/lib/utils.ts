import { readdir, rm, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

/**
 * Deletes the contents of a folder recursively and recreates it.
 * 
 * @param path - The path to the folder to clean up.
 */
export async function cleanupFolder(path: string): Promise<void> {
	if (existsSync(path)) {
		// If the folder exists, remove it and all its contents.
		await rm(path, { recursive: true, maxRetries: 3, retryDelay: 100 });
	}
	// Recreate the folder after deletion.
	ensureFolder(path);
}

/**
 * Copies files and directories recursively from a source to a destination path.
 * 
 * @param pathSrc - The source path.
 * @param pathDst - The destination path.
 */
export async function copyRecursive(pathSrc: string, pathDst: string): Promise<void> {
	await copy('');

	async function copy(fol: string): Promise<void> {
		const folSrc = resolve(pathSrc, fol);
		const folDst = resolve(pathDst, fol);
		if ((await stat(folSrc)).isDirectory()) {
			// If the source is a directory, ensure the destination directory exists.
			ensureFolder(folDst);
			for (const entry of await readdir(folSrc)) {
				// Skip hidden files and directories.
				if (entry.startsWith('.')) continue;
				// Recursively copy each entry.
				await copy(join(fol, entry));
			}
		} else {
			// If the source is a file, copy it to the destination.
			await pipeline(
				createReadStream(folSrc),
				createWriteStream(folDst),
			);
		}
	}
}

/**
 * Ensures that a folder exists, creating it (and any necessary parent directories) if it does not.
 * 
 * @param path - The path to the folder to ensure.
 */
export function ensureFolder(path: string): void {
	if (existsSync(path)) return; // If the folder already exists, do nothing.
	ensureFolder(dirname(path)); // Ensure the parent directory exists.
	mkdirSync(path); // Create the folder.
}

/**
 * Converts a readable stream to a buffer.
 * 
 * @param stream - The readable stream to convert.
 * @returns A promise that resolves to a buffer containing the stream's data.
 */
export async function streamAsBuffer(stream: Readable): Promise<Buffer> {
	return new Promise(res => {
		const buffers: Buffer[] = [];
		stream.on('data', (chunk: Buffer) => buffers.push(chunk));
		stream.on('end', () => {
			res(Buffer.concat(buffers));
		});
	});
}

/**
 * Fetches the latest release version of a GitHub repository.
 * 
 * @param owner - The GitHub username or organization name of the repository owner.
 * @param repo - The name of the repository.
 * @returns A promise that resolves to the latest release version string.
 */
export async function getLatestReleaseVersion(owner: string, repo: string): Promise<string> {
	const url = `https://api.github.com/repos/${owner}/${repo}/releases`;

	const headers = new Headers();
	// Optionally use a GitHub token for authorization.
	if (process.env.GITHUB_TOKEN != null) headers.append('Authorization', 'Bearer ' + process.env.GITHUB_TOKEN);

	const response = await fetch(url, { headers, redirect: 'follow' });
	const data = await response.json();
	// Validate the response data.
	if (!Array.isArray(data)) {
		console.log({ data });
		throw Error('wrong response, maybe set environment variable "GITHUB_TOKEN"?');
	}
	// Extract and return the latest version, ignoring the 'v' prefix.
	for (const entry of data) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const name = String(entry.tag_name);
		if (name.startsWith('v')) return name.slice(1);
	}
	// If no valid version is found, throw an error.
	throw Error(`Could not fetch the version of the latest release: https://github.com/${owner}/${repo}/releases`);
}
