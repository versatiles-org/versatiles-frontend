import { relative, resolve } from 'node:path';
import type { File, FileSystem } from './file_system.js';
import type { Ignore } from 'ignore';
import ignore from 'ignore';
import { createWriteStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';

export class Frontend {
	private readonly name: string;

	private readonly ignore: Ignore;

	private readonly fileSystem: FileSystem;

	public constructor(fileSystem: FileSystem, config: object, frontendsFolder: string) {
		this.fileSystem = fileSystem.clone();
		this.ignore = (ignore as unknown as () => Ignore)();

		if (!('name' in config)) throw Error();
		this.name = String(config.name);

		if (!('include' in config)) throw Error();
		if (!Array.isArray(config.include)) throw Error('"include" must be an array');
		config.include.forEach(path => {
			if (typeof path !== 'string') throw Error('paths in "include" must be strings');
			this.addPath(resolve(frontendsFolder, path));
		});

		if ('ignore' in config) {
			if (!Array.isArray(config.ignore)) throw Error('"ignore" must be an array');
			this.ignore.add(config.ignore);
		}
	}

	public async saveAsTarGz(folder: string): Promise<void> {
		const pack = tar.pack();
		for (const file of this.iterate()) {
			pack.entry({ name: file.name }, file.bufferRaw);
		}
		pack.finalize();

		await pipeline(
			pack,
			createGzip({ level: 9 }),
			createWriteStream(resolve(folder, this.name + '.tar.gz')),
		);
	}

	public async saveAsBrTar(folder: string): Promise<void> {
		await this.fileSystem.compress();
		const pack = tar.pack();
		for (const file of this.iterate()) {
			pack.entry({ name: file.name }, file.bufferBr);
		}
		pack.finalize();

		await pipeline(
			pack,
			createGzip({ level: 9 }),
			createWriteStream(resolve(folder, this.name + '.br.tar')),
		);
	}

	private *iterate(): IterableIterator<File> {
		const filter = this.ignore.createFilter();
		for (const file of this.fileSystem.iterate()) {
			if (filter(file.name)) yield file;
		}
	}

	private addPath(path0: string): void {
		if (!existsSync(path0)) throw Error(`path "${path0}" does not exist`);
		const { fileSystem } = this;
		addPathRec(path0);

		function addPathRec(path: string): void {
			readdirSync(path).forEach(name => {
				const fullname = resolve(path, name);
				const stat = statSync(fullname);
				if (stat.isDirectory()) {
					addPathRec(fullname);
				} else {
					fileSystem.addFile(
						relative(path0, fullname),
						stat.mtimeMs,
						readFileSync(fullname),
					);
				}
			});
		}
	}
}