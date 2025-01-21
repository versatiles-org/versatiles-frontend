import Pf from './utils/async';
import { Frontend, loadFrontendConfigs } from './frontend/frontend';
import progress from './utils/progress';
import { Server } from './server/server';
import arg from 'arg';
import { FileDBs, loadFileDBs } from './files/filedbs';

// Disables ANSI color codes in progress output for simplicity in development environments.
//progress.disableAnsi();

// Loads the configuration for all frontends within the project.
const frontendConfigs = await loadFrontendConfigs();

// parse arguments
const args = arg({
	'--local-proxy-port': Number,
	'-l': '--local-proxy-port',
},
	{
		permissive: false,
		argv: process.argv.slice(2)
	}
)

// Retrieves the name of the frontend to be developed from command line arguments.
const frontendName = args._[0];
if (frontendName == null) {
	console.error(`set a frontend name as first argument, e.g.: ${frontendConfigs.map(config => config.name).join(', ')}`);
	process.exit(1);
}

// Initializes the file system for managing files.
const fileDBs = new FileDBs();
progress.setHeader('Preparing Server');

// Loads and prepares assets for the frontend using the custom FileSystem.
await Pf.run(loadFileDBs(fileDBs));

// Indicates completion of the asset preparation stage.
progress.finish();

// Finds the configuration for the specified frontend.
const frontendConfig = frontendConfigs.find(config => config.name === frontendName);
if (!frontendConfig) {
	console.error(`unknown frontend "${frontendName}"`);
	process.exit(1);
}

// Initializes the specified frontend, entering watch mode to automatically update files on change.
const frontend = new Frontend(fileDBs, frontendConfig);
fileDBs.enterWatchMode();

// Starts a development server for the frontend, utilizing its file system and any dev-specific configurations.
const devConfig = {
	proxy: [{
		from: '/tiles/',
		to:
			args['--local-proxy-port']
				? `http://localhost:${args['--local-proxy-port']}/tiles/`
				: 'https://tiles.versatiles.org/tiles/',
	}]
};
const server = new Server(frontend, devConfig);
await server.start();
