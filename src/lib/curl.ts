import { resolve as urlResolve } from 'node:url';
import { createGunzip } from 'node:zlib';
import { finished } from 'node:stream/promises';
import tar from 'tar-stream';
import unzipper from 'unzipper';
import type { Entry } from 'unzipper';
import type { FileSystem } from './file_system';
import { streamAsBuffer } from './utils';
import cache from './cache';

/**
 * Provides utilities for fetching resources over HTTP(s), with support for caching,
 * decompression (gunzip), and extraction (untar and unzip).
 */
export class Curl {
	readonly #url: string;
	
	readonly #fileSystem: FileSystem;

	/**
	 * Constructs an instance of the Curl class.
	 * 
	 * @param fileSystem - An interface to the file system for saving files.
	 * @param url - The URL of the resource to fetch.
	 */
	public constructor(fileSystem: FileSystem, url: string) {
		this.#url = url;
		this.#fileSystem = fileSystem;
	}

	/**
	 * Fetches a gzipped tarball from the URL, decompresses, untars it, and saves the contents
	 * to the specified folder. Directories are skipped.
	 * 
	 * @param folder - The target folder where the untarred files will be saved.
	 */
	public async ungzipUntar(folder: string): Promise<void> {
		const extract = tar.extract();
		extract.on('entry', (header, stream, next) => {
			// Skip directories and handle only files.
			if (header.type === 'directory') {
				next();
				return;
			}
			if (header.type !== 'file') throw Error(String(header.type));
			const filename = urlResolve(folder, header.name);
			void streamAsBuffer(stream).then((buffer): void => {
				this.#fileSystem.addFile(filename, Number(header.mtime ?? Math.random()), buffer);
				next();
				return;
			});
		});

		const streamIn = createGunzip();
		streamIn.on('error', error => {
			console.log('gunzip error for: ' + this.#url);
			throw error;
		});
		streamIn.pipe(extract);
		streamIn.end(await this.getBuffer());
		await finished(extract);
	}

	/**
	 * Saves the resource from the URL directly to a file.
	 * 
	 * @param filename - The name of the file where the resource will be saved.
	 */
	public async save(filename: string): Promise<void> {
		this.#fileSystem.addFile(filename, Math.random(), await this.getBuffer());
	}

	/**
	 * Fetches a zip file from the URL, unzips it, and saves the contents using the specified filter function
	 * to determine the final path for each file. Files for which the filter returns false are skipped.
	 * 
	 * @param cbFilter - A callback function that determines the save path for each unzipped file, or skips the file.
	 */
	public async unzip(cbFilter: (filename: string) => string | false): Promise<void> {
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const filename = cbFilter(entry.path);
			if (filename != false) {
				void entry.buffer().then(buffer => {
					this.#fileSystem.addFile(filename, entry.vars.lastModifiedTime, buffer);
				});
			} else {
				entry.autodrain();
			}
		});
		zip.end(await this.getBuffer());
		await finished(zip);
	}

	/**
	 * Fetches the resource from the URL and returns it as a Buffer. The result is cached
	 * to avoid redundant downloads.
	 * 
	 * @returns A Promise resolving to the Buffer containing the fetched resource.
	 */
	public async getBuffer(): Promise<Buffer> {
		return cache(
			'getBuffer:' + this.#url,
			async () => {
				const response = await fetch(this.#url, { redirect: 'follow' });
				return Buffer.from(await response.arrayBuffer());
			},
		);
	}
}
