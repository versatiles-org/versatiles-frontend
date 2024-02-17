#!/usr/bin/env node

import { resolve } from 'node:path';
import { cleanupFolder } from './lib/utils.js';
import notes from './lib/release_notes.js';
import { readFileSync } from 'node:fs';
import type { PromiseFunction } from './lib/async.js';
import { parallel, sequential } from './lib/async.js';
import { FileSystem } from './lib/file_system.js';
import { Frontend } from './lib/frontend.js';
import { getAssets } from './lib/assets.js';
import progress from './lib/progress.js';



const watchMode = process.argv[2] === 'watch';
if (watchMode) console.log('Start in watch mode');

const projectFolder = new URL('..', import.meta.url).pathname;
const dstFolder = resolve(projectFolder, 'dist');
const frontendsFolder = resolve(projectFolder, 'frontends');
const fileSystem = new FileSystem();

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const frontendVersion = String(JSON.parse(readFileSync(new URL('../package.json', import.meta.url).pathname, 'utf8')).version);
notes.setVersion(frontendVersion);


// create an empty folder
await cleanupFolder(dstFolder);

const frontendConfigs = JSON.parse(readFileSync(resolve(frontendsFolder, 'frontends.json'), 'utf8')) as unknown[];

await sequential(
	getAssets(fileSystem),
	compressFiles(),
	parallel(
		...frontendConfigs.map(frontendConfig => generateFrontend(frontendConfig)),
	),
)();

notes.save(resolve(dstFolder, 'notes.md'));

process.exit();


function compressFiles(): PromiseFunction {
	const s = progress.add('compress files');
	return async () => {
		await fileSystem.compress(status => {
			s.updateLabel(`compress files: ${(100 * status).toFixed(0)}%`);
		});
		s.close();
	};
}

function generateFrontend(config: unknown): PromiseFunction {
	if (typeof config !== 'object') throw Error();
	if (config == null) throw Error();

	if (!('name' in config)) throw Error();
	const name = String(config.name);

	const s = progress.add('generate frontend: ' + name);
	const sBr = progress.add('generate .br.tar', 1);
	const sGz = progress.add('generate .tar.gz', 1);
	return async () => {
		const frontend = new Frontend(fileSystem, config, frontendsFolder);
		await frontend.saveAsBrTar(dstFolder);
		sBr.close();
		await frontend.saveAsTarGz(dstFolder);
		sGz.close();
		s.close();
	};
}
