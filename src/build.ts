import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

import { cleanupFolder } from './utils/utils';
import notes from './utils/release_notes';
import PromiseFunction from './utils/async';
import progress from './utils/progress';
import { generateFrontends } from './frontend/generate';
import { FileDBs, loadFileDBs } from './files/filedbs';

//progress.disableAnsi();

// Define the project and destination folders using relative and absolute paths.
const projectFolder = new URL('..', import.meta.url).pathname;
const dstFolder = resolve(projectFolder, 'release');


const frontendVersion = String(JSON.parse(readFileSync(resolve(projectFolder, 'package.json'), 'utf8')).version);
notes.setVersion(frontendVersion);

// Set the header for the progress display to indicate the build process is starting.
progress.setHeader('Building Release');

// Clean up the destination folder before starting the build.
cleanupFolder(dstFolder);

// Run the main build tasks sequentially: fetch assets, compress files, and generate frontends.
const fileDBs = new FileDBs();
await PromiseFunction.run(PromiseFunction.sequential(
	loadFileDBs(fileDBs),
	fileDBs.precompress(),
	generateFrontends(fileDBs, dstFolder),
));

// Save release notes in the destination folder.
notes.save(resolve(dstFolder, 'notes.md'));

// Signal the end of the build process in the progress display.
progress.finish();

