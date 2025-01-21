import { createGunzip } from 'node:zlib';
import { finished } from 'node:stream/promises';
import * as tar from 'tar';
import unzipper from 'unzipper';
import type { Entry } from 'unzipper';
import type { FileSystem } from '../files/filedb';
import { cache } from './cache';
import { resolve as urlResolve } from 'node:url';

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
	public async ungzipUntar(cbFilter: (filename: string) => string[] | false): Promise<void> {
		const streamIn = createGunzip();
		streamIn.on('error', error => {
			console.log('gunzip error for: ' + this.#url);
			throw error;
		});
		streamIn.pipe(tar.t({
			onReadEntry: async entry => {
				if (entry.type !== 'File') return entry.resume();
				const path = cbFilter(entry.path);
				if (path != false) {
					const buffers: Buffer[] = [];
					for await (const buffer of entry) buffers.push(buffer);
					const filename = path.reduce((f0, f1) => urlResolve(f0, f1));
					this.#fileSystem.addBufferAsFile(
						filename,
						Number(entry.mtime ?? Math.random()),
						Buffer.concat(buffers)
					);
				}
				entry.resume();
			}
		}));
		streamIn.end(await this.getBuffer());
		await finished(streamIn);
	}

	/**
	 * Saves the resource from the URL directly to a file.
	 * 
	 * @param filename - The name of the file where the resource will be saved.
	 */
	public async save(filename: string): Promise<void> {
		this.#fileSystem.addBufferAsFile(filename, Math.random(), await this.getBuffer());
	}

	/**
	 * Fetches a zip file from the URL, unzips it, and saves the contents using the specified filter function
	 * to determine the final path for each file. Files for which the filter returns false are skipped.
	 * 
	 * @param cbFilter - A callback function that determines the save path for each unzipped file, or skips the file.
	 */
	public async unzip(cbFilter: (filename: string) => string[] | false): Promise<void> {
		const zip = unzipper.Parse();
		zip.on('entry', (entry: Entry) => {
			const path = cbFilter(entry.path);
			if (path != false) {
				const filename = path.reduce((f0, f1) => urlResolve(f0, f1));
				void entry.buffer().then(buffer => {
					this.#fileSystem.addBufferAsFile(filename, entry.vars.lastModifiedTime, buffer);
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
			'getBuffer',
			this.#url,
			async () => {
				const response = await fetch(this.#url, { redirect: 'follow' });
				if (response.status !== 200) throw Error(`url "${this.#url}" returned error ${response.status}`);
				return Buffer.from(await response.arrayBuffer());
			},
		);
	}
}
