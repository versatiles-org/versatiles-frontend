import { progress, PromiseFunction } from './async_progress';
import { Frontend } from './frontend/frontend';
import { loadFrontendConfigs } from './frontend/load';
import { Server } from './server/server';
import { LandingPage, type LandingEntry } from './server/landing';
import arg from 'arg';
import { FileDBs, loadFileDBs } from './files/filedbs';

// Disables ANSI color codes in progress output for simplicity in development environments.
//progress.disableAnsi();

// Loads the configuration for all frontends within the project.
const frontendConfigs = await loadFrontendConfigs();

// parse arguments
const args = arg(
	{
		'--port': Number,
		'-p': '--port',
		'--local-proxy-port': Number,
		'-l': '--local-proxy-port',
		'--host': String,
	},
	{
		permissive: false,
		argv: process.argv.slice(2),
	}
);

// Frontend names may be given as arguments; without any, every frontend is served.
const names = args._.length > 0 ? args._ : frontendConfigs.map((config) => config.name);

const unknown = names.filter((name) => !frontendConfigs.some((config) => config.name === name));
if (unknown.length > 0) {
	console.error(`unknown frontend${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`);
	console.error(`available: ${frontendConfigs.map((config) => config.name).join(', ')}`);
	process.exit(1);
}

// Initializes the file system for managing files.
const fileDBs = new FileDBs();
progress.setHeader('Preparing Server');

// Loads and prepares assets for the frontend using the custom FileSystem.
// Every source is loaded regardless of which frontends are served, so serving all of them
// costs little more than serving one: each Frontend is just a filter over the shared files.
await PromiseFunction.run(loadFileDBs(fileDBs));

// Indicates completion of the asset preparation stage.
progress.finish();

// One watcher covers every frontend, since they all read from the same file databases.
fileDBs.enterWatchMode();

// Development-specific configuration shared by all frontends.
const devConfig = {
	proxy: [
		{
			from: '/tiles/',
			to: args['--local-proxy-port']
				? `http://localhost:${args['--local-proxy-port']}/tiles/`
				: 'https://tiles.versatiles.org/tiles/',
		},
	],
};

// Loopback by default, so a development server is not published to the network.
const host = args['--host'] ?? '127.0.0.1';

// The frontends listen on ports chosen by the operating system: those can never collide
// with another service by accident. The landing page below makes them discoverable.
const entries: LandingEntry[] = [];
for (const name of names) {
	const config = frontendConfigs.find((c) => c.name === name);
	if (!config) continue; // unreachable, names were validated above
	const server = new Server(new Frontend(fileDBs, config), devConfig);
	entries.push({ name, description: config.description, port: await server.start(0, host) });
}

const landing = new LandingPage(entries);
const landingPort = await landing.start(args['--port'] ?? 8080, host, (busy) =>
	console.log(`Port ${busy} is already in use, trying the next one.`)
);

const width = Math.max(...entries.map((entry) => entry.name.length));
console.log(`\nOverview:  http://localhost:${landingPort}/\n`);
for (const entry of entries) {
	console.log(`  ${entry.name.padEnd(width)}  http://localhost:${entry.port}/`);
}
console.log('');
