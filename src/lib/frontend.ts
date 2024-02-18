/* eslint-disable @typescript-eslint/require-await */
import { basename, relative, resolve } from 'node:path';
import type { File, FileSystem } from './file_system.js';
import type { Ignore } from 'ignore';
import ignore from 'ignore';
import type { WatchEventType } from 'node:fs';
import { createWriteStream, existsSync, readFileSync, readdirSync, statSync, watch } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import Pf from './async.js';
import notes from './release_notes.js';
import type { ProgressLabel } from './progress.js';
import progress from './progress.js';
import { parseDevConfig, type DevConfig } from './server.js';

interface FrontendConfig {
	name: string;
	include: string[];
	ignore?: string[];
	dev?: DevConfig;
}

export class Frontend {
	public readonly fileSystem: FileSystem;

	private readonly name: string;

	private readonly include: string[];

	private readonly frontendsPath: string;

	private readonly ignore: Ignore;

	public constructor(fileSystem: FileSystem, config: FrontendConfig, frontendsPath: string) {
		this.fileSystem = fileSystem.clone();
		this.ignore = (ignore as unknown as () => Ignore)();
		this.name = config.name;
		this.frontendsPath = frontendsPath;
		this.include = config.include;

		this.include.forEach(include => {
			const fullPath = resolve(this.frontendsPath, include);
			this.addPath(fullPath, fullPath);
		});

		if (config.ignore) this.ignore.add(config.ignore);
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

	public enterWatchMode(): void {
		this.include.forEach(include => {
			const fullPath = resolve(this.frontendsPath, include);
			watch(fullPath, { recursive: true }, (event: WatchEventType, filename: string | null) => {
				if (filename == null) return;
				const fullname = resolve(fullPath, filename);
				try {
					this.addPath(fullname, fullPath);
				} catch (error) {

				}
			});
		});

	}

	private *iterate(): IterableIterator<File> {
		const filter = this.ignore.createFilter();
		for (const file of this.fileSystem.iterate()) {
			if (filter(file.name)) yield file;
		}
	}

	private addPath(path: string, dir: string): void {
		if (!existsSync(path)) throw Error(`path "${path}" does not exist`);
		if (basename(path).startsWith('.')) return;

		const stat = statSync(path);
		if (stat.isDirectory()) {
			readdirSync(path).forEach(name => {
				this.addPath(resolve(path, name), dir);
			});
		} else {
			this.fileSystem.addFile(
				relative(dir, path),
				stat.mtimeMs,
				readFileSync(path),
			);
		}
	}
}



export function loadFrontendConfigs(frontendsFolder: string): FrontendConfig[] {
	const configs = JSON.parse(readFileSync(resolve(frontendsFolder, 'frontends.json'), 'utf8')) as unknown;
	if (typeof configs !== 'object' || configs == null) throw new Error('Invalid configuration object');

	return Object.entries(configs)
		.map(([name, configDef]: [string, unknown]) => parseFrontendConfig(name, configDef));
}

function parseFrontendConfig(name: string, configDef: unknown): FrontendConfig {
	if (typeof configDef !== 'object' || configDef == null) throw new Error('Invalid configuration definition');

	// check 'include'
	if (!('include' in configDef)) throw new Error('Missing \'include\' property');
	if (!Array.isArray(configDef.include) || !configDef.include.every(e => typeof e === 'string')) {
		throw new Error('Invalid \'include\' property, must be an array of strings');
	}
	const include = configDef.include as string[];

	const config: FrontendConfig = { name, include };

	// check 'ignore'
	if ('ignore' in configDef) {
		if (!Array.isArray(configDef.ignore) || !configDef.ignore.every(e => typeof e === 'string')) {
			throw new Error('Invalid \'ignore\' property, must be an array of strings');
		}
		config.ignore = configDef.ignore as string[];
	}

	// check 'dev'
	if ('dev' in configDef) {
		config.dev = parseDevConfig(configDef.dev);
	}

	return config;
}

export function generateFrontends(fileSystem: FileSystem, projectFolder: string, dstFolder: string): Pf {
	const frontendsFolder = resolve(projectFolder, 'frontends');

	const frontendConfigs = loadFrontendConfigs(frontendsFolder);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const frontendVersion = String(JSON.parse(readFileSync(resolve(projectFolder, 'package.json'), 'utf8')).version);
	notes.setVersion(frontendVersion);

	return Pf.wrapProgress('generate frontends',
		Pf.parallel(
			...frontendConfigs.map(config => generateFrontend(config)),
		),
	);

	function generateFrontend(config: FrontendConfig): Pf {
		const { name } = config;
		let s: ProgressLabel, sBr: ProgressLabel, sGz: ProgressLabel;

		return Pf.single(
			async () => {
				s = progress.add(name, 1);
				sBr = progress.add(name + '.br.tar', 2);
				sGz = progress.add(name + '.tar.gz', 2);
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
