import { resolve } from 'node:path';
import Pf from './utils/async';
import { FileSystem } from './lib/file_system';
import { Frontend, loadFrontendConfigs } from './lib/frontend';
import { getAssets } from './lib/assets';
import progress from './utils/progress';
import { Server } from './server/server';

// Disables ANSI color codes in progress output for simplicity in development environments.
progress.disableAnsi();

// Defines the project folder
const projectFolder = new URL('..', import.meta.url).pathname;

// Loads the configuration for all frontends within the project.
const frontendsFolder = resolve(projectFolder, 'frontends');
const frontendConfigs = await loadFrontendConfigs(frontendsFolder);

// Retrieves the name of the frontend to be developed from command line arguments.
const frontendName = process.argv[2] as string | undefined;
if (frontendName == null) {
	console.error(`set a frontend name as first argument, e.g.: ${frontendConfigs.map(config => config.name).join(', ')}`);
	process.exit(1);
}

// Initializes the file system for managing files.
const fileSystem = new FileSystem();
progress.setHeader('Preparing Server');

// Loads and prepares assets for the frontend using the custom FileSystem.
await Pf.run(getAssets(fileSystem));

// Indicates completion of the asset preparation stage.
progress.finish();

// Finds the configuration for the specified frontend.
const frontendConfig = frontendConfigs.find(config => config.name === frontendName);
if (!frontendConfig) {
	console.error(`unknown frontend "${frontendName}"`);
	process.exit(1);
}

// Initializes the specified frontend, entering watch mode to automatically update files on change.
const frontend = new Frontend(fileSystem, frontendConfig, frontendsFolder);
frontend.enterWatchMode();

// Starts a development server for the frontend, utilizing its file system and any dev-specific configurations.
const devConfig = {
	proxy: [{
		from: '/tiles/',
		to: 'https://tiles.versatiles.org/tiles/'
	}]
};
const server = new Server(frontend.fileSystem, devConfig);
await server.start();
