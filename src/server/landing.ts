import express from 'express';
import escapeHtml from 'escape-html';
import type { Server as HttpServer } from 'http';
import { listenWithFallback } from './listen';

/**
 * One frontend served by the development server.
 */
export interface LandingEntry {
	name: string;
	description: string;
	port: number;
}

/**
 * An overview page listing every running frontend.
 *
 * The frontends themselves listen on ports picked by the operating system, which can never
 * collide but are not memorable. This page is the stable entry point that links to them.
 */
export class LandingPage {
	private readonly app = express();

	private server?: HttpServer;

	public constructor(entries: LandingEntry[]) {
		const html = renderPage(entries);
		this.app.get(/.*/, (_req, res) => {
			res.header('content-type', 'text/html; charset=utf-8').status(200).end(html);
		});
	}

	/**
	 * Starts the page on `preferred`, or the next free port if that one is taken.
	 *
	 * @returns The port it actually bound.
	 */
	public async start(preferred: number, host: string, onBusy?: (port: number) => void): Promise<number> {
		const listening = await listenWithFallback(this.app, preferred, host, onBusy);
		this.server = listening.server;
		return listening.port;
	}

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

/**
 * Renders the overview as a self-contained page, so it needs no assets of its own.
 */
export function renderPage(entries: LandingEntry[]): string {
	const rows = entries
		.map(
			(entry) => `			<li>
				<a href="http://localhost:${entry.port}/">${escapeHtml(entry.name)}</a>
				<span class="port">:${entry.port}</span>
				<p>${escapeHtml(entry.description)}</p>
			</li>`
		)
		.join('\n');

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>VersaTiles - Development</title>
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<style>
			:root {
				color-scheme: light dark;
			}
			body {
				font-family: system-ui, sans-serif;
				max-width: 40rem;
				margin: 3rem auto;
				padding: 0 1.5rem;
				line-height: 1.5;
			}
			h1 {
				font-size: 1.3rem;
				margin-bottom: 0.2rem;
			}
			.subtitle {
				opacity: 0.6;
				margin-top: 0;
			}
			ul {
				list-style: none;
				padding: 0;
			}
			li {
				padding: 0.9rem 0;
				border-top: 1px solid rgba(128, 128, 128, 0.3);
			}
			a {
				font-weight: 600;
				font-size: 1.05rem;
			}
			.port {
				opacity: 0.5;
				font-family: ui-monospace, monospace;
				font-size: 0.9rem;
				margin-left: 0.4rem;
			}
			li p {
				margin: 0.2rem 0 0;
				opacity: 0.75;
				font-size: 0.9rem;
			}
		</style>
	</head>
	<body>
		<h1>VersaTiles</h1>
		<p class="subtitle">Development server - all frontends are watching for changes.</p>
		<ul>
${rows}
		</ul>
	</body>
</html>
`;
}
