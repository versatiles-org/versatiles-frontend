import express from 'express';
import escapeHtml from 'escape-html';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import { posix } from 'path';
import { lookup } from 'mrmime';
import { Frontend } from '../frontend/frontend';
import { listen } from './listen';

/**
 * Defines the structure for development server configurations,
 * specifically for defining proxy rules.
 */
export interface DevConfig {
	proxy?: { from: string; to: string }[]; // Array of proxy configurations.
}

/**
 * Represents a development server capable of serving files and proxying requests based on configuration.
 */
/**
 * Percent-decodes a request path, or returns false if it is malformed (e.g. "%ZZ").
 *
 * Decoding is safe here because lookups hit an in-memory map of known file names: a decoded
 * "../" simply fails to match rather than reaching the file system.
 */
function decodePath(path: string): string | false {
	try {
		return decodeURIComponent(path);
	} catch {
		return false;
	}
}

export class Server {
	private readonly app: Express;

	private server?: HttpServer;

	/**
	 * Constructs a Server instance.
	 *
	 * @param fileSystem - The file system from which to serve files.
	 * @param config - Optional development configuration for the server.
	 */
	public constructor(frontend: Frontend, config?: DevConfig) {
		this.app = express();

		this.app.get(/.*/, (req, res) => {
			// File names are stored decoded, but req.path is not, so "my%20file.txt" would
			// never match "my file.txt". Only the lookup is decoded; the proxy below forwards
			// the original path, where the encoding is the upstream's business.
			const path = decodePath(req.path);
			if (path === false) {
				res.status(400).end(`path "${escapeHtml(req.path)}" is not valid.`);
				return;
			}

			// Attempt to serve the request from the file system.
			if (tryFrontend(path)) return;

			// Attempt to serve an index.html file if the request is for a directory.
			// `posix.join` (not the deprecated `url.resolve`) keeps the path a plain path:
			// no percent-encoding, and no doubled slash when req.path already ends in one.
			if (tryFrontend(posix.join(path, 'index.html'))) return;

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
	 * Starts the server and resolves with the port it is actually listening on.
	 *
	 * Express calls the `listen` callback even when the bind failed, so a taken port would
	 * otherwise look like a successful start while another service answers the requests.
	 * Only the `listening` event means the socket is ours; `error` (e.g. EADDRINUSE) is
	 * reported to the caller so it can pick another port.
	 *
	 * @param port - The port to bind to, or 0 to let the operating system pick a free one.
	 * @param host - The interface to bind to. Loopback by default, so a development server
	 *               is not published to the network.
	 * @returns The bound port, which is the only way to learn the real one when passing 0.
	 */
	public async start(port = 8080, host = '127.0.0.1'): Promise<number> {
		// Assigned only on success, so a server that never bound is not treated as running.
		const listening = await listen(this.app, port, host);
		this.server = listening.server;
		return listening.port;
	}

	/**
	 * Stops the server, if it is running.
	 */
	public async stop(): Promise<void> {
		const server = this.server;
		if (!server) return;
		this.server = undefined;
		server.closeAllConnections();
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}
}
