

import express from 'express';
import type { FileSystem } from './file_system.js';
import type { Express } from 'express';
import { resolve } from 'node:url';
import cache from './cache.js';


export interface DevConfig {
	proxy?: [{ from: string; to: string }];
}

export function parseDevConfig(configDef: unknown): DevConfig {
	const config: DevConfig = {};
	if (typeof configDef !== 'object' || configDef == null) throw new Error('Invalid \'dev\' property, must be an object');

	// check 'dev.proxy'
	if ('proxy' in configDef) {
		const { proxy } = configDef;
		if (!Array.isArray(proxy) || !proxy.every((p: unknown) => {
			if (typeof p !== 'object' || p == null) return false;
			if (!('from' in p) || !('to' in p)) return false;
			if (typeof p.from !== 'string' || typeof p.to !== 'string') return false;
			return true;
		})) {
			throw new Error('Invalid \'proxy\' configuration, each proxy must be an object with \'from\' and \'to\' string properties');
		}

		config.proxy = proxy as [{ from: string; to: string }];
	}

	return config;
}


export class Server {
	private readonly app: Express;

	public constructor(fileSystem: FileSystem, config?: DevConfig) {
		this.app = express();

		this.app.get('*', (req, res) => {
			if (tryFileSystem(req.path)) return;
			if (tryFileSystem(resolve(req.path + '/', 'index.html'))) return;
			void tryProxy(req.path).then(value => {
				if (value) return;
				res.status(404).end(`path "${req.path}" not found.`);
			});

			function tryFileSystem(path: string): boolean {
				path = path.replace(/^\/+/, '');
				const buffer = fileSystem.getFile(path);
				if (buffer == null) return false;
				res.status(200).end(buffer);
				return true;
			}

			async function tryProxy(path: string): Promise<boolean> {
				if (!config) return false;
				if (!config.proxy) return false;

				const proxy = config.proxy.find(p => path.startsWith(p.from));
				if (!proxy) return false;

				const url = proxy.to + path.slice(proxy.from.length);

				const buffer = await cache('fetch:' + url, async (): Promise<Buffer> => {
					return Buffer.from(await (await fetch(url)).arrayBuffer());
				});
				if (buffer.length === 0) return false;
				
				res.status(200).end(buffer);
				return true;

			}
		});
	}

	public async start(): Promise<void> {
		return new Promise(res => this.app.listen(8080, () => {
			console.log('Server started: http://localhost:8080/');
			res();
		}));
	}
}
