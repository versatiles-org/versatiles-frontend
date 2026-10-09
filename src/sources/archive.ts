import { createGunzip, createZstdDecompress } from 'zlib';
import { posix } from 'path';
import type { Transform } from 'stream';
import { finished } from 'stream/promises';
import * as tar from 'tar';
import unzipper from 'unzipper';
import type { Entry } from 'unzipper';
import { cache, fetchRetry } from '../utils';

/** Maps the name of an archive entry to the file name to store it as, or `false` to skip it. */
export type MapName = (name: string) => string | false;

/** Receives an extracted file. */
export type OnFile = (path: string, content: Buffer) => void;

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
 * An archive at a URL: downloads it (cached) and extracts its files, decompressing gzip or zstd
 * tarballs and zip files. It hands every extracted file to a callback, and stores nothing itself.
 */
export class Archive {
	private readonly url: string;

	/**
	 * @param url - The URL of the archive.
	 */
	public constructor(url: string) {
		this.url = url;
	}

	/**
	 * Fetches a gzipped tarball from the URL, decompresses, untars it, and saves the contents.
	 * See {@link untar} for how entries are handled.
	 *
	 * @param mapName - Determines the file name of each entry, or skips it.
	 * @param onFile - Receives every extracted file.
	 */
	public async ungzipUntar(mapName: MapName, onFile: OnFile): Promise<void> {
		await this.untar(createGunzip(), mapName, onFile);
	}

	/**
	 * Fetches a zstd-compressed tarball from the URL, decompresses, untars it, and saves the
	 * contents. See {@link untar} for how entries are handled.
	 *
	 * @param mapName - Determines the file name of each entry, or skips it.
	 * @param onFile - Receives every extracted file.
	 */
	public async unzstdUntar(mapName: MapName, onFile: OnFile): Promise<void> {
		await this.untar(createZstdDecompress(), mapName, onFile);
	}

	/**
	 * Decompresses the fetched tarball with the given stream, untars it, and saves the contents.
	 * Directories are skipped.
	 *
	 * Hardlinks and symlinks are saved as files with the content of their target, sharing the
	 * target's buffer. Dangling links and links pointing outside the archive are skipped.
	 *
	 * @param streamIn - A fresh decompression stream, e.g. from `createGunzip()`.
	 * @param mapName - Determines the file name of each entry, or skips it.
	 * @param onFile - Receives every extracted file.
	 */
	private async untar(streamIn: Transform, mapName: MapName, onFile: OnFile): Promise<void> {
		const buffer = await this.getBuffer();
		// Track each entry's read so we can await them all; the stream's 'end'
		// event only signals the end of parsing, not that every file was read.
		const pending: Promise<void>[] = [];
		// Every regular file by normalized archive path. Links are resolved against this map, so
		// it also keeps files that mapName skips: they can still be the target of a link.
		const files = new Map<string, { path: string; content: Buffer }>();
		const links = new Map<string, TarLink>();
		await new Promise<void>((resolve, reject) => {
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
			const dest = mapName(path);
			if (dest !== false) onFile(dest, content);
		}

		// Links are resolved only now: file reads finish asynchronously, and a symlink's
		// target may even appear later in the archive.
		for (const link of links.values()) {
			const dest = mapName(link.path);
			if (dest === false) continue;
			const content = resolveLink(link, links, files);
			if (content === 'unsafe') {
				console.warn(`Skipping unsafe link "${link.path}" -> "${link.linkpath}" (escapes the archive)`);
			} else if (content === 'dangling') {
				console.warn(`Skipping dangling link "${link.path}" -> "${link.linkpath}"`);
			} else {
				// Share the target's buffer instead of copying it.
				onFile(dest, content);
			}
		}
	}

	/**
	 * Fetches a zip file from the URL and unzips it. Directories are skipped.
	 *
	 * @param mapName - Determines the file name of each entry, or skips it.
	 * @param onFile - Receives every extracted file.
	 */
	public async unzip(mapName: MapName, onFile: OnFile): Promise<void> {
		const buffer = await this.getBuffer();
		// Track each entry's write; `finished(zip)` only resolves when the stream
		// ends, not when the async entry.buffer() writes have completed.
		const pending: Promise<void>[] = [];
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const path = entry.type === 'Directory' ? false : mapName(entry.path);
			if (path === false) {
				entry.autodrain();
				return;
			}
			pending.push(
				entry.buffer().then((buf) => {
					onFile(path, buf);
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
