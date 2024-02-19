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

// Define the project and destination folders using relative and absolute paths.
const projectFolder = new URL('..', import.meta.url).pathname;
const dstFolder = resolve(projectFolder, 'release');
// Initialize a new file system to manage files within the project.
const fileSystem = new FileSystem();
// Set the header for the progress display to indicate the build process is starting.
progress.setHeader('Building Release');

// Clean up the destination folder before starting the build.
await cleanupFolder(dstFolder);

// Run the main build tasks sequentially: fetch assets, compress files, and generate frontends.
await Pf.runSequential(
	getAssets(fileSystem),
	compressFiles(),
	generateFrontends(fileSystem, projectFolder, dstFolder),
);

// Save release notes in the destination folder.
notes.save(resolve(dstFolder, 'notes.md'));

// Signal the end of the build process in the progress display.
progress.finish();

/**
 * Defines a task to compress files within the file system.
 * Utilizes the `Pf.single` method to encapsulate asynchronous operations with progress tracking.
 * 
 * @returns A PromiseFunction (Pf) instance representing the compression task.
 */
function compressFiles(): Pf {
	let s: ProgressLabel;
	return Pf.single(
		async () => {
			// Add a progress label for file compression.
			s = progress.add('compress files');
		},
		async () => {
			// Mark the start of file compression, perform the compression,
			// update the progress label with the compression status, and then mark it as finished.
			s.start();
			await fileSystem.compress(status => {
				s.updateLabel(`compress files: ${(100 * status).toFixed(0)}%`);
			});
			s.end();
		},
	);
}
