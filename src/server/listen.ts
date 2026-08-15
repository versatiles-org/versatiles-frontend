import type { Express } from 'express';
import type { Server as HttpServer } from 'http';

export interface Listening {
	server: HttpServer;
	port: number;
}

/**
 * Binds an Express app and resolves only once the socket is really ours.
 *
 * Express calls the `listen` callback even when the bind failed, so a taken port would
 * otherwise look like a successful start while another service keeps answering the
 * requests. Only the `listening` event means success; `error` (e.g. EADDRINUSE) is
 * reported to the caller so it can pick another port.
 *
 * @param port - The port to bind to, or 0 to let the operating system pick a free one.
 * @param host - The interface to bind to.
 * @returns The server and the port it actually bound, which is the only way to learn
 *          the real one when passing 0.
 */
export async function listen(app: Express, port: number, host: string): Promise<Listening> {
	return new Promise((resolve, reject) => {
		const server = app.listen(port, host);

		server.once('error', reject);
		server.once('listening', () => {
			server.removeListener('error', reject);
			const address = server.address();
			if (address == null || typeof address === 'string') {
				reject(new Error(`server bound to an unexpected address: ${JSON.stringify(address)}`));
				return;
			}
			resolve({ server, port: address.port });
		});
	});
}

/**
 * Binds to `preferred`, moving on to the next port whenever one is already taken, and
 * finally letting the operating system choose. Attempting the bind is itself the test for
 * whether a port is free: checking first and binding afterwards would leave a window in
 * which another process can take it.
 *
 * @param onBusy - Called for every port that turned out to be occupied, so the caller can
 *                 explain why the server ended up somewhere else.
 */
export async function listenWithFallback(
	app: Express,
	preferred: number,
	host: string,
	onBusy?: (port: number) => void,
	attempts = 20
): Promise<Listening> {
	for (let port = preferred; port < preferred + attempts; port++) {
		try {
			return await listen(app, port, host);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
			onBusy?.(port);
		}
	}
	// Every candidate was busy - fall back to an arbitrary free port rather than giving up.
	return listen(app, 0, host);
}
