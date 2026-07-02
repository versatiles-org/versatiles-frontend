import express from 'express';
import escapeHtml from 'escape-html';
import type { Express } from 'express';
import { resolve } from 'url';
import { lookup } from 'mrmime';
import { Frontend } from '../frontend/frontend';

/**
 * Defines the structure for development server configurations,
 * specifically for defining proxy rules.
 */
export interface DevConfig {
	proxy?: { from: string; to: string }[]; // Array of proxy configurations.
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
		throw new Error("Invalid 'dev' property, must be an object");
	}

	// Check for and validate the 'proxy' property if present.
	if ('proxy' in configDef) {
		const { proxy } = configDef;
		if (
			!Array.isArray(proxy) ||
			!proxy.every((p: unknown) => {
				// Ensure each proxy rule is an object with 'from' and 'to' string properties.
				if (typeof p !== 'object' || p == null) return false;
				if (!('from' in p) || !('to' in p)) return false;
				if (typeof p.from !== 'string' || typeof p.to !== 'string') return false;
				return true;
			})
		) {
			throw new Error(
				"Invalid 'proxy' configuration, each proxy must be an object with 'from' and 'to' string properties"
			);
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
	public constructor(frontend: Frontend, config?: DevConfig) {
		this.app = express();

		this.app.get(/.*/, (req, res) => {
			// Attempt to serve the request from the file system.
			if (tryFrontend(req.path)) return;

			// Attempt to serve an index.html file if the request is for a directory.
			if (tryFrontend(resolve(req.path + '/', 'index.html'))) return;

			// Attempt to proxy the request based on configuration.
			void tryProxy(req.path)
				.then((value) => {
					if (value) return;
					// Respond with 404 if the file was not found in the file system and no proxy rule matched.
					res.status(404).end(`path "${escapeHtml(req.path)}" not found.`);
				})
				.catch(() => {
					res.status(502).end('proxy error');
				});

			/**
			 * Attempts to serve a file from the file system.
			 *
			 * @param path - The request path.
			 * @returns True if the file was served, false otherwise.
			 */
			function tryFrontend(path: string): boolean {
				path = path.replace(/^\/+/, ''); // Remove leading slashes for file system lookup.
				const buffer = frontend.getFile(path);
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

				const proxy = config.proxy.find((p) => path.startsWith(p.from));
				if (!proxy) return false;

				const url = proxy.to + path.slice(proxy.from.length);

				// A matching proxy rule always handles the request. Forward the upstream
				// status and body verbatim — including error statuses and empty bodies —
				// instead of masking them as 200 (hiding errors) or 404 (dropping empty
				// but valid responses such as empty tiles).
				const response = await fetch(url);
				const contentType = response.headers.get('content-type') ?? lookup(url) ?? 'application/octet-stream';
				const buffer = Buffer.from(await response.arrayBuffer());

				res.header('content-type', contentType).status(response.status).end(buffer);
				return true;
			}
		});
	}

	/**
	 * Starts the server on a specified port, logging a message once it's running.
	 */
	public async start(port = 8080): Promise<void> {
		return new Promise((res) =>
			this.app.listen(port, () => {
				console.log(`Server started: http://localhost:${port}/`);
				res();
			})
		);
	}
}
