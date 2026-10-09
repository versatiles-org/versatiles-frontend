import { resolve } from 'path';
import { constants, createGzip, createZstdCompress } from 'zlib';
import { createWriteStream } from 'fs';
import type { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import tar from 'tar-stream';
import type { File } from '../sources';
import type { Frontend } from './frontend';

/*
 * Packs the files of a frontend into the bundles: a tarball compressed with gzip, the same with
 * every file brotli-compressed, and a tarball compressed with zstd.
 */

// Compression level of the .tar.zst bundles: close to the maximum (22), but much faster.
// Level 22 only shrinks `frontend` by a further 4.5% and takes about eight times as long.
const ZSTD_LEVEL = 19;

// Long-distance matching lets zstd reference data far outside the window level 19 uses by
// default (8 MiB), which matters because the bundles are hundreds of MiB of similar glyph PBFs.
// 128 MiB (2^27) is the largest window decoders accept without extra flags, so `zstd -d`,
// versatiles-rs and Node's own createZstdDecompress all read the result as-is.
const ZSTD_WINDOW_LOG = 27;

/**
 * Starts writing the tarball before any entry is added. Without a consumer attached the pack
 * queues every entry internally, holding the whole bundle in memory on top of the buffers the
 * FileDBs already keep; consuming as we go bounds that to roughly one entry.
 */
function startPipeline(pack: tar.Pack, compressor: Transform, filename: string): Promise<void> {
	const written = pipeline(pack, compressor, createWriteStream(filename));
	// The awaited result below reports failures. Attach a handler now so a pipeline error
	// while the entry loop is still running is not reported as an unhandled rejection.
	written.catch(() => undefined);
	return written;
}

/**
 * Adds one entry and resolves once the pack has flushed it, so the loop advances at the
 * speed of the compression/disk pipeline instead of racing ahead of it.
 */
function addEntry(pack: tar.Pack, name: string, buffer: Buffer): Promise<void> {
	return new Promise((res, rej) => {
		pack.entry({ name }, buffer, (error) => {
			if (error) rej(error);
			else res();
		});
	});
}

/**
 * Adds a hardlink entry pointing to an earlier entry of the same tarball.
 */
function addLink(pack: tar.Pack, name: string, linkname: string): Promise<void> {
	return new Promise((res, rej) => {
		pack.entry({ name, type: 'link', linkname }, (error) => {
			if (error) rej(error);
			else res();
		});
	});
}

/**
 * Remembers the first entry name for each content. Returns that name if an earlier entry has
 * the same content (so this one can become a hardlink), or undefined if this is the first.
 */
function findEarlierEntry(firstNames: Map<string, string>, file: File, name: string): string | undefined {
	// Empty files take no space in a tarball, so a link would save nothing.
	if (file.bufferRaw.length === 0) return undefined;
	const firstName = firstNames.get(file.contentHash);
	if (firstName == null) firstNames.set(file.contentHash, name);
	return firstName;
}

/**
 * Saves the frontend as a Gzip-compressed tarball.
 *
 * @param frontend - The frontend to pack.
 * @param folder - The destination folder for the tarball.
 */
export async function saveAsTarGz(frontend: Frontend, folder: string): Promise<void> {
	await saveTarball(frontend, resolve(folder, frontend.config.name + '.tar.gz'), createGzip({ level: 9 }), {
		content: (file) => file.bufferRaw,
	});
}

/**
 * Saves the frontend as a Brotli-compressed tarball.
 *
 * @param frontend - The frontend to pack.
 * @param folder - The destination folder for the tarball.
 */
export async function saveAsBrTarGz(frontend: Frontend, folder: string): Promise<void> {
	await saveTarball(frontend, resolve(folder, frontend.config.name + '.br.tar.gz'), createGzip({ level: 9 }), {
		suffix: '.br',
		content: async (file) => file.bufferBr ?? (await file.compress()),
	});
}

/**
 * Saves the frontend as a Zstandard-compressed tarball.
 *
 * @param frontend - The frontend to pack.
 * @param folder - The destination folder for the tarball.
 */
export async function saveAsTarZst(frontend: Frontend, folder: string): Promise<void> {
	const compressor = createZstdCompress({
		params: {
			[constants.ZSTD_c_compressionLevel]: ZSTD_LEVEL,
			[constants.ZSTD_c_enableLongDistanceMatching]: 1,
			[constants.ZSTD_c_windowLog]: ZSTD_WINDOW_LOG,
			[constants.ZSTD_c_checksumFlag]: 1,
			// No ZSTD_c_nbWorkers: in Node 24.16 a multithreaded zstd stream fed by tar-stream
			// fails with ERR_STREAM_PUSH_AFTER_EOF. The frontends are compressed in parallel anyway.
		},
	});
	await saveTarball(frontend, resolve(folder, frontend.config.name + '.tar.zst'), compressor, {
		content: (file) => file.bufferRaw,
	});
}

/**
 * Writes all files of the frontend into a compressed tarball. A file whose content already
 * appeared earlier is written as a hardlink to that entry, which keeps duplicated glyph ranges
 * from growing the bundles. versatiles-rs serves hardlinks from tar sources since 4.14.0.
 *
 * @param frontend - The frontend to pack.
 * @param filename - The path of the tarball.
 * @param compressor - A fresh compression stream, e.g. from `createGzip()`.
 * @param options.suffix - Appended to every entry name, e.g. `.br`.
 * @param options.content - Returns the bytes to store for a file.
 */
async function saveTarball(
	frontend: Frontend,
	filename: string,
	compressor: Transform,
	options: { suffix?: string; content: (file: File) => Buffer | Promise<Buffer> }
): Promise<void> {
	const pack = tar.pack();
	const written = startPipeline(pack, compressor, filename);
	const firstNames = new Map<string, string>();

	for (const file of frontend.iterate()) {
		const name = file.name + (options.suffix ?? '');
		// Same raw content gives the same stored bytes (also after brotli), so link to the earlier entry.
		const linkname = findEarlierEntry(firstNames, file, name);
		if (linkname != null) await addLink(pack, name, linkname);
		else await addEntry(pack, name, await options.content(file));
	}
	pack.finalize();

	await written;
}
