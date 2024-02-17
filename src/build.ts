#!/usr/bin/env node
/* eslint-disable @typescript-eslint/require-await */

import { resolve } from 'node:path';
import { cleanupFolder } from './lib/utils.js';
import notes from './lib/release_notes.js';
import { readFileSync } from 'node:fs';
import Pf from './lib/async.js';
import { FileSystem } from './lib/file_system.js';
import { Frontend } from './lib/frontend.js';
import { getAssets } from './lib/assets.js';
import type { ProgressLabel } from './lib/progress.js';
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

await Pf.runSequential(
	getAssets(fileSystem),
	compressFiles(),
	generateFrontends(),
);

notes.save(resolve(dstFolder, 'notes.md'));

process.exit();


function compressFiles(): Pf {
	let s: ProgressLabel;
	return Pf.single(
		async () => {
			s = progress.add('compress files');
		},
		async () => {
			await fileSystem.compress(status => {
				s.updateLabel(`compress files: ${(100 * status).toFixed(0)}%`);
			});
			s.close();
		},
	);
}

function generateFrontends(): Pf {
	return Pf.wrapProgress('generate frontends',
		Pf.parallel(
			...frontendConfigs.map(frontendConfig => generateFrontend(frontendConfig)),
		),
	);

	function generateFrontend(config: unknown): Pf {
		if (typeof config !== 'object') throw Error();
		if (config == null) throw Error();

		if (!('name' in config)) throw Error();
		const name = String(config.name);

		let s: ProgressLabel, sBr: ProgressLabel, sGz: ProgressLabel;

		return Pf.single(
			async () => {
				s = progress.add(name, 1);
				sBr = progress.add('.br.tar', 2);
				sGz = progress.add('.tar.gz', 2);
			},
			async () => {
				const frontend = new Frontend(fileSystem, config, frontendsFolder);
				await frontend.saveAsBrTar(dstFolder);
				sBr.close();
				await frontend.saveAsTarGz(dstFolder);
				sGz.close();
				s.close();
			},
		);
	}
}