import { progress, PromiseFunction } from './async-progress';
import { frontendConfigs, sourceConfigs } from './config';
import { serveFrontends } from './server/serve';
import arg from 'arg';
import { resolve } from 'path';
import { FileDBs } from './sources/file-dbs';
import { loadSources } from './pipeline';

// Disables ANSI color codes in progress output for simplicity in development environments.
//progress.disableAnsi();

// The root of the project, which holds the static sources in frontends/.
const projectFolder = resolve(import.meta.dirname, '..');

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
await PromiseFunction.run(loadSources(fileDBs, sourceConfigs, resolve(projectFolder, 'frontends')));

// Indicates completion of the asset preparation stage.
progress.finish();

// One watcher covers every frontend, since they all read from the same file databases.
fileDBs.enterWatchMode();

// The frontends to serve, in the order they were named.
const configs = names.flatMap((name) => frontendConfigs.filter((config) => config.name === name));

// Loopback by default, so a development server is not published to the network.
const { landingPort, entries } = await serveFrontends(fileDBs, configs, {
	host: args['--host'] ?? '127.0.0.1',
	port: args['--port'] ?? 8080,
	proxy: [
		{
			from: '/tiles/',
			to: args['--local-proxy-port']
				? `http://localhost:${args['--local-proxy-port']}/tiles/`
				: 'https://tiles.versatiles.org/tiles/',
		},
	],
	onBusy: (busy) => console.log(`Port ${busy} is already in use, trying the next one.`),
});

const width = Math.max(...entries.map((entry) => entry.name.length));
console.log(`\nOverview:  http://localhost:${landingPort}/\n`);
for (const entry of entries) {
	console.log(`  ${entry.name.padEnd(width)}  http://localhost:${entry.port}/`);
}
console.log('');
