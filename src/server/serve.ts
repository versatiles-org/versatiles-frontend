import type { FileDBs } from '../sources/file-dbs';
import { Frontend, type FrontendConfig } from '../frontend/frontend';
import { LandingPage, type LandingEntry } from './landing-page';
import { FrontendServer, type ProxyRule } from './frontend-server';

export interface ServeOptions {
	/** The interface to bind to. Loopback keeps the servers off the network. */
	host: string;
	/** The preferred port of the landing page; the next free one is taken if it is busy. */
	port: number;
	/** Proxy rules shared by all frontends, e.g. for the tiles. */
	proxy?: ProxyRule[];
	/** Called for every port of the landing page that turned out to be taken. */
	onBusy?: (port: number) => void;
}

export interface Serving {
	/** The port of the landing page. */
	landingPort: number;
	/** The served frontends, in the order of the configs, with their ports. */
	entries: LandingEntry[];
	/** Stops the landing page and every frontend server. */
	stop(): Promise<void>;
}

/**
 * Serves each frontend on a port of its own and starts the landing page that links to them.
 *
 * The frontends listen on ports chosen by the operating system: those can never collide with
 * another service by accident. The landing page on `options.port` makes them discoverable.
 */
export async function serveFrontends(
	fileDBs: FileDBs,
	configs: FrontendConfig[],
	options: ServeOptions
): Promise<Serving> {
	const servers: FrontendServer[] = [];
	const entries: LandingEntry[] = [];
	for (const config of configs) {
		const server = new FrontendServer(new Frontend(fileDBs, config), { proxy: options.proxy });
		servers.push(server);
		entries.push({ name: config.name, description: config.description, port: await server.start(0, options.host) });
	}

	const landing = new LandingPage(entries);
	const landingPort = await landing.start(options.port, options.host, options.onBusy);

	return {
		landingPort,
		entries,
		async stop() {
			await landing.stop();
			for (const server of servers) await server.stop();
		},
	};
}
