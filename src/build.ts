import { resolve } from 'node:path';
import { cleanupFolder } from './utils/utils';
import notes from './utils/release_notes';
import PromiseFunction from './utils/async';
import { FileSystem } from './filesystem/file_system';
import { generateFrontends } from './frontend/frontend';
import { loadAssets } from './frontend/assets';
import type { ProgressLabel } from './utils/progress';
import progress from './utils/progress';

//progress.disableAnsi();

// Define the project and destination folders using relative and absolute paths.
const projectFolder = new URL('..', import.meta.url).pathname;
const dstFolder = resolve(projectFolder, 'release');
// Initialize a new file system to manage files within the project.
const fileSystem = new FileSystem();
// Set the header for the progress display to indicate the build process is starting.
progress.setHeader('Building Release');

// Clean up the destination folder before starting the build.
cleanupFolder(dstFolder);

// Run the main build tasks sequentially: fetch assets, compress files, and generate frontends.
await PromiseFunction.run(PromiseFunction.sequential(
	loadAssets(fileSystem),
	compressFiles(),
	await generateFrontends(fileSystem, projectFolder, dstFolder),
));

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
function compressFiles(): PromiseFunction {
	let s: ProgressLabel;
	return PromiseFunction.single(
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
