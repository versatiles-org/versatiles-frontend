import express from 'express';
import type { FileSystem } from '../lib/file_system';
import type { Express } from 'express';
import { resolve } from 'node:url';
import { cache } from '../utils/cache';
import { lookup } from 'mrmime';

/**
 * Defines the structure for development server configurations,
 * specifically for defining proxy rules.
 */
export interface DevConfig {
	proxy?: [{ from: string; to: string }]; // Array of proxy configurations.
}

/**
 * Parses and validates a development configuration object,
 * ensuring it meets the expected structure for `DevConfig`.
 * 
 * @param configDef - The configuration object to parse.
 * @returns A validated `DevConfig` object.
 */
export function parseDevConfig(configDef: unknown): DevConfig {
	const config: DevConfig = {};
	// Validate that configDef is an object.
	if (typeof configDef !== 'object' || configDef == null) {
		throw new Error('Invalid \'dev\' property, must be an object');
	}

	// Check for and validate the 'proxy' property if present.
	if ('proxy' in configDef) {
		const { proxy } = configDef;
		if (!Array.isArray(proxy) || !proxy.every((p: unknown) => {
			// Ensure each proxy rule is an object with 'from' and 'to' string properties.
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

/**
 * Represents a development server capable of serving files and proxying requests based on configuration.
 */
export class Server {
	private readonly app: Express;

	/**
	 * Constructs a Server instance.
	 * 
	 * @param fileSystem - The file system from which to serve files.
	 * @param config - Optional development configuration for the server.
	 */
	public constructor(fileSystem: FileSystem, config?: DevConfig) {
		this.app = express();

		this.app.get('*', (req, res) => {
			// Attempt to serve the request from the file system.
			if (tryFileSystem(req.path)) return;

			// Attempt to serve an index.html file if the request is for a directory.
			if (tryFileSystem(resolve(req.path + '/', 'index.html'))) return;

			// Attempt to proxy the request based on configuration.
			void tryProxy(req.path).then(value => {
				if (value) return;
				// Respond with 404 if the file was not found in the file system and no proxy rule matched.
				res.status(404).end(`path "${req.path}" not found.`);
			});

			/**
			 * Attempts to serve a file from the file system.
			 * 
			 * @param path - The request path.
			 * @returns True if the file was served, false otherwise.
			 */
			function tryFileSystem(path: string): boolean {
				path = path.replace(/^\/+/, ''); // Remove leading slashes for file system lookup.
				const buffer = fileSystem.getFile(path);
				if (buffer == null) return false;
				res
					.header('content-type', lookup(path) ?? 'application/octet-stream')
					.status(200)
					.end(buffer);
				return true;
			}

			/**
			 * Attempts to proxy the request based on development configuration.
			 * 
			 * @param path - The request path.
			 * @returns A promise that resolves to true if the request was proxied, false otherwise.
			 */
			async function tryProxy(path: string): Promise<boolean> {
				if (!config?.proxy) return false;

				const proxy = config.proxy.find(p => path.startsWith(p.from));
				if (!proxy) return false;

				const url = proxy.to + path.slice(proxy.from.length);

				// Fetch the proxied URL, using the cache to avoid repeated requests.
				const contentType = await cache('fetchType:' + url, async (): Promise<Buffer> => {
					const { headers } = await fetch(url);
					return Buffer.from(headers.get('content-type') ?? lookup(url) ?? 'application/octet-stream');
				});

				// Fetch the proxied URL, using the cache to avoid repeated requests.
				const buffer = await cache('fetch:' + url, async (): Promise<Buffer> => {
					return Buffer.from(await (await fetch(url)).arrayBuffer());
				});
				if (buffer.length === 0) return false;

				res
					.header('content-type', contentType.toString())
					.status(200)
					.end(buffer);
				return true;
			}
		});
	}

	/**
	 * Starts the server on a specified port, logging a message once it's running.
	 */
	public async start(): Promise<void> {
		return new Promise(res => this.app.listen(8080, () => {
			console.log('Server started: http://localhost:8080/');
			res();
		}));
	}
}
