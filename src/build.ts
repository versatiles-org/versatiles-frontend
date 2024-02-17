#!/usr/bin/env node
/* eslint-disable @typescript-eslint/require-await */

import { resolve } from 'node:path';
import { cleanupFolder } from './lib/utils.js';
import notes from './lib/release_notes.js';
import Pf from './lib/async.js';
import { FileSystem } from './lib/file_system.js';
import { generateFrontends } from './lib/frontend.js';
import { getAssets } from './lib/assets.js';
import type { ProgressLabel } from './lib/progress.js';
import progress from './lib/progress.js';

export async function build(): Promise<void> {
	const projectFolder = new URL('..', import.meta.url).pathname;
	const dstFolder = resolve(projectFolder, 'dist');
	const fileSystem = new FileSystem();


	// create an empty folder
	await cleanupFolder(dstFolder);

	await Pf.runSequential(
		getAssets(fileSystem),
		compressFiles(),
		generateFrontends(fileSystem, projectFolder, dstFolder),
	);

	notes.save(resolve(dstFolder, 'notes.md'));

	console.log('Finished');

	function compressFiles(): Pf {
		let s: ProgressLabel;
		return Pf.single(
			async () => {
				s = progress.add('compress files');
			},
			async () => {
				s.start();
				await fileSystem.compress(status => {
					s.updateLabel(`compress files: ${(100 * status).toFixed(0)}%`);
				});
				s.end();
			},
		);
	}
}