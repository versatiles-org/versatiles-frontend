import express from 'express';
import escapeHtml from 'escape-html';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import { posix } from 'path';
import { lookup } from 'mrmime';
import { Frontend } from '../frontend/frontend';
import { close, listen } from './listen';

/** Forwards requests whose path starts with `from` to the URL `to` plus the rest of the path. */
export interface ProxyRule {
	from: string;
	to: string;
}

export interface FrontendServerOptions {
	/** Requests that match no file of the frontend go to the first matching rule. */
	proxy?: ProxyRule[];
}

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

/**
 * The content type to serve a file with.
 *
 * Only the mapping is decided here. Express appends `charset=utf-8` itself when it sets a
 * Content-Type that takes one, so the bare type returned below reaches the client as, for
 * example, `text/css; charset=utf-8`.
 */
function contentTypeFor(path: string): string {
	// To mrmime the `.ts` in `.d.ts` is an MPEG transport stream, so a TypeScript declaration -
	// which the bundles ship for several libraries - would otherwise be served as `video/mp2t`.
	if (path.endsWith('.d.ts')) return 'text/plain';

	return lookup(path) ?? 'application/octet-stream';
}

/**
 * A development server for one frontend: serves its files and proxies the other requests,
 * e.g. for the tiles, according to the proxy rules.
 */
export class FrontendServer {
	private readonly app: Express;

	private server?: HttpServer;

	/**
	 * @param frontend - The frontend to serve.
	 * @param options - The proxy rules.
	 */
	public constructor(frontend: Frontend, options?: FrontendServerOptions) {
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
				res.header('content-type', contentTypeFor(path)).status(200).end(buffer);
				return true;
			}

			/**
			 * Attempts to proxy the request based on development configuration.
			 *
			 * @param path - The request path.
			 * @returns A promise that resolves to true if the request was proxied, false otherwise.
			 */
			async function tryProxy(path: string): Promise<boolean> {
				if (!options?.proxy) return false;

				const proxy = options.proxy.find((p) => path.startsWith(p.from));
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
	 * Starts the server and resolves with the port it is actually listening on. Fails if the
	 * port is taken, see {@link listen}.
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
		await close(server);
	}
}
