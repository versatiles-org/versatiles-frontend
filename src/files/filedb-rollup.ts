import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { existsSync, watch } from 'fs';
import { basename, dirname, normalize } from 'path';
import { rollup } from 'rollup';
import css from 'rollup-plugin-import-css';
import { FileDB } from './filedb';

export interface RollupFileDBConfig {
	type: 'rollup';
	path: string; // name of source folder
	url: string; // resulting url of the main js file
	globalVariable: string; // name of the global variable
}

export class RollupFileDB extends FileDB {
	private config: RollupFileDBConfig;
	private frontendFolder: string;

	constructor(config: RollupFileDBConfig, frontendFolder: string) {
		super();
		this.config = config;
		this.frontendFolder = frontendFolder;
	}

	public static async build(config: RollupFileDBConfig, frontendFolder: string): Promise<RollupFileDB> {
		const db = new RollupFileDB(config, frontendFolder);
		await db.rollup();
		return db;
	}

	private async rollup(): Promise<void> {
		const { path, globalVariable, url } = this.config;
		const baseDirname = dirname(url);
		const baseFilename = basename(url).split('.').slice(0, -1).join('.');

		const input = normalize(`${this.frontendFolder}/${path}/index.ts`);
		if (!existsSync(input)) throw new Error(`Input file not found: ${input}`);

		const tsconfig = normalize(`${this.frontendFolder}/tsconfig.json`);

		const bundle = await rollup({
			input,
			plugins: [
				nodeResolve(),
				css({ output: baseFilename + '.css' }),
				typescript({ tsconfig })
			],
			external: ['maplibregl'],
			onLog(level, log, handler) {
				if (log.code === 'CIRCULAR_DEPENDENCY') return;
				handler(level, log);
			}
		});

		const result = await bundle.generate({
			format: 'iife',
			name: globalVariable,
			sourcemap: true,
			globals: { 'maplibregl': 'maplibre-gl' },
			file: baseFilename + '.js'
		});

		const now = Date.now();
		for (const output of result.output) {

			let content: Buffer;
			if ('code' in output) {
				content = Buffer.from(output.code);
			} else if ('source' in output) {
				content = Buffer.from(output.source as string);
			} else continue;

			const filename = normalize(`${baseDirname}/${output.fileName}`);
			this.setFileFromBuffer(filename, now, Buffer.from(content));
		}
	}

	public enterWatchMode(): void {
		const path = normalize(`${this.frontendFolder}/${this.config.path}`);
		watch(path, { recursive: true }, (event, filename) => {
			if (!filename || (event !== 'change' && event !== 'rename')) return;
			this.rollup();
		})
	}
}
