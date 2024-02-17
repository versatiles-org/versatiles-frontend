
import { resolve } from 'node:path';
import Pf from './lib/async.js';
import { FileSystem } from './lib/file_system.js';
import { Frontend, loadFrontendConfigs } from './lib/frontend.js';
import { getAssets } from './lib/assets.js';
import progress from './lib/progress.js';
import { Server } from './lib/server.js';

export async function watch(frontendName: string): Promise<void> {
	const projectFolder = new URL('..', import.meta.url).pathname;
	const fileSystem = new FileSystem();
	progress.setHeader('Preparing Server');

	await Pf.run(getAssets(fileSystem));

	progress.finish();

	const frontendsFolder = resolve(projectFolder, 'frontends');
	const frontendConfigs = loadFrontendConfigs(frontendsFolder);

	const frontendConfig = frontendConfigs.find(config => config.name === frontendName);
	if (!frontendConfig) throw Error(`unknown frontend "${frontendName}"`);

	const frontend = new Frontend(fileSystem, frontendConfig, frontendsFolder);
	frontend.enterWatchMode();

	const server = new Server(fileSystem);
	await server.start();
}
