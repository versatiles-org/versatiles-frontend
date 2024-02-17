/* eslint-disable @typescript-eslint/require-await */
import { relative, resolve } from 'node:path';
import type { File, FileSystem } from './file_system.js';
import type { Ignore } from 'ignore';
import ignore from 'ignore';
import { createWriteStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import Pf from './async.js';
import notes from './release_notes.js';
import type { ProgressLabel } from './progress.js';
import progress from './progress.js';

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

export function generateFrontends(fileSystem: FileSystem, projectFolder: string, dstFolder: string): Pf {
	const frontendsFolder = resolve(projectFolder, 'frontends');

	const frontendConfigs = JSON.parse(readFileSync(resolve(frontendsFolder, 'frontends.json'), 'utf8')) as unknown[];

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const frontendVersion = String(JSON.parse(readFileSync(resolve(projectFolder, 'package.json'), 'utf8')).version);
	notes.setVersion(frontendVersion);

	return Pf.wrapProgress('generate frontends',
		Pf.parallel(
			...frontendConfigs.map(frontendConfig => generateFrontend(frontendConfig)),
		),
	);

	function generateFrontend(config: unknown): Pf {
		if (typeof config !== 'object') throw Error();
		if (config == null) throw Error();

		if (!('name' in config)) throw Error();
		const name = String(config.name);

		let s: ProgressLabel, sBr: ProgressLabel, sGz: ProgressLabel;

		return Pf.single(
			async () => {
				s = progress.add(name, 1);
				sBr = progress.add('.br.tar', 2);
				sGz = progress.add('.tar.gz', 2);
			},
			async () => {
				s.start();
				sBr.start();
				sGz.start();
				const frontend = new Frontend(fileSystem, config, frontendsFolder);
				await frontend.saveAsBrTar(dstFolder);
				sBr.end();
				await frontend.saveAsTarGz(dstFolder);
				sGz.end();
				s.end();
			},
		);
	}
}
