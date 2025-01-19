import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { existsSync, watch, WatchEventType } from 'node:fs';
import { normalize } from 'node:path';
import { rollup } from 'rollup';
import { File, FileSystem } from './file_system';

export interface RollupConfig {
	name: string;
	id: string;
	path: string;
}

export class RollupFrontends {
	constructor() {
	}

	async get(id: string): Promise<FileSystem> {
		const configs = await this.loadRollupConfigs();
		const config = configs.find(c => c.id === id);
		if (!config) throw new Error(`Rollup config not found: ${id}`);
		return await this.rollupFrontend(config);
	}
	/**
	 * Loads rollup configurations from a `rollups.json` file.
	 * 
	 * @returns An array of RollupConfig objects.
	 */
	async loadRollupConfigs(): Promise<RollupConfig[]> {
		return (await import('../../frontends/rollups.ts?' + Date.now())).rollupConfigs;
	}

	async rollupFrontend(config: RollupConfig): Promise<FileSystem> {
		const rollupFolder = normalize(import.meta.dirname + '/../../frontends/rollups/');

		const { name, id, path } = config;

		const input = normalize(`${rollupFolder}/${id}/index.ts`);
		const tsconfig = normalize(`${rollupFolder}/tsconfig.json`);

		console.log({
			rollupFolder,
			input,
			tsconfig
		})

		if (!existsSync(input)) throw new Error(`Input file not found: ${input}`);

		const bundle = await rollup({
			input,
			plugins: [nodeResolve(), typescript({ tsconfig })],
			external: ['maplibre-gl'],
		});

		const result = await bundle.generate({
			format: 'iife',
			name,
			sourcemap: true,
			globals: {
				'maplibre-gl': 'maplibre-gl'
			}
		});

		const files = new Map<string, File>();
		const now = Date.now();
		for (const output of result.output) {

			let content: Buffer;
			if ('code' in output) {
				content = Buffer.from(output.code);
			} else if ('source' in output) {
				content = Buffer.from(output.source);
			} else continue;

			const name = normalize(`${path}/${output.fileName}`);
			files.set(name, new File(name, now, Buffer.from(content)));
		}

		return new FileSystem(files);
	}

	public async watch(id: string, cb: (rollupFrontend: FileSystem) => void): Promise<void> {
		const rollupFolder = normalize(import.meta.dirname + '/../../frontends/rollups/');
		const configs = await this.loadRollupConfigs();
		const config = configs.find(c => c.id === id);
		if (!config) throw new Error(`Rollup config not found: ${id}`);

		const update = async () => cb(await this.rollupFrontend(config));

		update();

		const fullPath = normalize(`${rollupFolder}/${id}`);
		watch(fullPath, { recursive: true }, async (event: WatchEventType, filename: string | null) => {
			console.log('watch', event, filename);
			if (filename == null) return;
			update();
		});
	}
}
