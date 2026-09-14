import { createGunzip } from 'zlib';
import { posix } from 'path';
import { finished } from 'stream/promises';
import * as tar from 'tar';
import unzipper from 'unzipper';
import type { Entry } from 'unzipper';
import type { FileDB } from '../files/filedb';
import { cache } from './cache';
import { fetchRetry } from './fetch';

/**
 * A hardlink or symlink entry of a tarball.
 */
interface TarLink {
	path: string; // entry name as stored in the archive
	linkpath: string; // link target as stored in the archive
	target: string | null; // normalized archive path of the target, or null if it escapes the archive
}

// Upper bound for link chains, so a symlink cycle cannot loop forever.
const MAX_LINK_DEPTH = 32;

/**
 * Resolves a link target to a normalized archive path. Hardlink targets are relative to the
 * archive root, symlink targets to the directory of the link.
 *
 * @returns The normalized path, or null if the target is absolute or escapes the archive root.
 */
function resolveLinkTarget(type: 'Link' | 'SymbolicLink', name: string, linkpath: string): string | null {
	if (!linkpath || posix.isAbsolute(linkpath)) return null;
	const target = type === 'Link' ? posix.normalize(linkpath) : posix.join(posix.dirname(name), linkpath);
	if (target === '..' || target.startsWith('../')) return null;
	return target;
}

/**
 * Follows a link, and any links it points to, to the content of a regular file.
 */
function resolveLink(
	link: TarLink,
	links: Map<string, TarLink>,
	files: Map<string, { content: Buffer }>
): Buffer | 'unsafe' | 'dangling' {
	for (let depth = 0; depth < MAX_LINK_DEPTH; depth++) {
		if (link.target === null) return 'unsafe';
		const file = files.get(link.target);
		if (file) return file.content;
		const next = links.get(link.target);
		if (!next) return 'dangling';
		link = next;
	}
	return 'dangling';
}

/**
 * Provides utilities for fetching resources over HTTP(s), with support for caching,
 * decompression (gunzip), and extraction (untar and unzip).
 */
export class Curl {
	private readonly url: string;

	private readonly fileDB: FileDB;

	/**
	 * Constructs an instance of the Curl class.
	 *
	 * @param fileDB - An interface to the file system for saving files.
	 * @param url - The URL of the resource to fetch.
	 */
	public constructor(fileDB: FileDB, url: string) {
		this.url = url;
		this.fileDB = fileDB;
	}

	/**
	 * Fetches a gzipped tarball from the URL, decompresses, untars it, and saves the contents
	 * to the specified folder. Directories are skipped.
	 *
	 * Hardlinks and symlinks are saved as files with the content of their target, sharing the
	 * target's buffer. Dangling links and links pointing outside the archive are skipped.
	 *
	 * @param cbFilter - A callback function that determines the save path for each entry, or skips the entry.
	 */
	public async ungzipUntar(cbFilter: (filename: string) => string | false): Promise<void> {
		const buffer = await this.getBuffer();
		// Track each entry's read so we can await them all; the stream's 'end'
		// event only signals the end of parsing, not that every file was read.
		const pending: Promise<void>[] = [];
		// Every regular file by normalized archive path. Links are resolved against this map, so
		// it also keeps files that cbFilter skips: they can still be the target of a link.
		const files = new Map<string, { path: string; content: Buffer }>();
		const links = new Map<string, TarLink>();
		await new Promise<void>((resolve, reject) => {
			const streamIn = createGunzip();
			const extract = tar.t({
				onReadEntry: (entry) => {
					const name = posix.normalize(entry.path);
					if (entry.type === 'Link' || entry.type === 'SymbolicLink') {
						const linkpath = entry.linkpath ?? '';
						links.set(name, { path: entry.path, linkpath, target: resolveLinkTarget(entry.type, name, linkpath) });
						return entry.resume();
					}
					if (entry.type !== 'File') return entry.resume();
					const work = (async (): Promise<void> => {
						const buffers: Buffer[] = [];
						for await (const buf of entry) buffers.push(buf);
						files.set(name, { path: entry.path, content: Buffer.concat(buffers) });
					})();
					// Propagate read failures instead of leaving them as unhandled rejections.
					work.catch(reject);
					pending.push(work);
				},
			});
			streamIn.on('error', reject);
			extract.on('error', reject);
			extract.on('end', resolve);
			streamIn.pipe(extract);
			streamIn.end(buffer);
		});
		// Wait for all in-flight entry reads to complete before saving.
		await Promise.all(pending);

		for (const { path, content } of files.values()) {
			const dest = cbFilter(path);
			if (dest !== false) this.fileDB.setFileFromBuffer(dest, content);
		}

		// Links are resolved only now: file reads finish asynchronously, and a symlink's
		// target may even appear later in the archive.
		for (const link of links.values()) {
			const dest = cbFilter(link.path);
			if (dest === false) continue;
			const content = resolveLink(link, links, files);
			if (content === 'unsafe') {
				console.warn(`Skipping unsafe link "${link.path}" -> "${link.linkpath}" (escapes the archive)`);
			} else if (content === 'dangling') {
				console.warn(`Skipping dangling link "${link.path}" -> "${link.linkpath}"`);
			} else {
				// Share the target's buffer instead of copying it.
				this.fileDB.setFileFromBuffer(dest, content);
			}
		}
	}

	/**
	 * Saves the resource from the URL directly to a file.
	 *
	 * @param filename - The name of the file where the resource will be saved.
	 */
	public async save(filename: string): Promise<void> {
		this.fileDB.setFileFromBuffer(filename, await this.getBuffer());
	}

	/**
	 * Fetches a zip file from the URL, unzips it, and saves the contents using the specified filter function
	 * to determine the final path for each file. Files for which the filter returns false are skipped.
	 *
	 * @param cbFilter - A callback function that determines the save path for each unzipped file, or skips the file.
	 */
	public async unzip(cbFilter: (filename: string) => string | false): Promise<void> {
		const buffer = await this.getBuffer();
		// Track each entry's write; `finished(zip)` only resolves when the stream
		// ends, not when the async entry.buffer() writes have completed.
		const pending: Promise<void>[] = [];
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const path = cbFilter(entry.path);
			if (path === false) {
				entry.autodrain();
				return;
			}
			pending.push(
				entry.buffer().then((buf) => {
					this.fileDB.setFileFromBuffer(path, buf);
				})
			);
		});
		zip.end(buffer);
		await finished(zip);
		// Wait for all in-flight entry writes to complete before returning.
		await Promise.all(pending);
	}

	/**
	 * Fetches the resource from the URL and returns it as a Buffer. The result is cached
	 * to avoid redundant downloads.
	 *
	 * @returns A Promise resolving to the Buffer containing the fetched resource.
	 */
	public async getBuffer(): Promise<Buffer> {
		return cache('getBuffer', this.url, async () => {
			const url = this.url;
			if (!url.startsWith('https://')) {
				throw Error(`only secure https:// urls are supported, got: ${url}`);
			}
			const response = await fetchRetry(url, { redirect: 'follow' });
			if (response.status !== 200) throw Error(`url "${url}" returned error ${response.status}`);
			return Buffer.from(await response.arrayBuffer());
		});
	}
}
