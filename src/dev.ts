
import { resolve } from 'node:path';
import Pf from './lib/async.js';
import { FileSystem } from './lib/file_system.js';
import { Frontend, loadFrontendConfigs } from './lib/frontend.js';
import { getAssets } from './lib/assets.js';
import progress from './lib/progress.js';
import { Server } from './lib/server.js';

progress.disableAnsi();

const frontendName = process.argv[2] as string | undefined;
if (frontendName == null) {
	console.error('set a frontend name as first argument, e.g. "frontend"');
	process.exit(1);
}

const projectFolder = new URL('..', import.meta.url).pathname;
const fileSystem = new FileSystem();
progress.setHeader('Preparing Server');

await Pf.run(getAssets(fileSystem));

progress.finish();

const frontendsFolder = resolve(projectFolder, 'frontends');
const frontendConfigs = loadFrontendConfigs(frontendsFolder);

const frontendConfig = frontendConfigs.find(config => config.name === frontendName);
if (!frontendConfig) {
	console.error(`unknown frontend "${frontendName}"`);
	process.exit(1);
}

const frontend = new Frontend(fileSystem, frontendConfig, frontendsFolder);
frontend.enterWatchMode();

const server = new Server(frontend.fileSystem, frontendConfig.dev);
await server.start();
