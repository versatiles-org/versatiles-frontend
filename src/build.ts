import { resolve } from 'path';
import { readFileSync } from 'fs';

import { cleanupFolder } from './utils/utils';
import notes from './utils/release_notes';
import { PromiseFunction, progress } from './async_progress';
import { generateFrontends } from './frontend/generate';
import { FileDBs, loadFileDBs } from './files/filedbs';

//progress.disableAnsi();

// Define the project and destination folders using relative and absolute paths.
const projectFolder = resolve(import.meta.dirname, '..');
const dstFolder = resolve(projectFolder, 'release');

const packageJson = JSON.parse(readFileSync(resolve(projectFolder, 'package.json'), 'utf8')) as { version: string };
notes.setVersion(String(packageJson.version));

// Set the header for the progress display to indicate the build process is starting.
progress.setHeader('Building Release');

// Clean up the destination folder before starting the build.
cleanupFolder(dstFolder);

try {
	// Run the main build tasks sequentially: fetch assets, compress files, and generate frontends.
	const fileDBs = new FileDBs();
	await PromiseFunction.run(
		PromiseFunction.sequential(loadFileDBs(fileDBs), fileDBs.precompress(), generateFrontends(fileDBs, dstFolder))
	);

	// Save release notes in the destination folder.
	notes.save(resolve(dstFolder, 'notes.md'));

	// Signal the end of the build process in the progress display.
	progress.finish();
} catch (error) {
	// Close the progress display before reporting, so the run is visibly marked as failed rather
	// than just stopping. Catching also keeps Node from adding its own dump of the throwing source
	// line and runtime version around an error that is usually expected, such as a 401 from the
	// GitHub API.
	progress.fail();
	console.error('\nBuild failed:');
	console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
	// Exit rather than setting exitCode: requests started before the failure can still be in
	// flight, and waiting out their timeouts would delay the report by up to half a minute.
	process.exit(1);
}
