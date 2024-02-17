#!/usr/bin/env tsx

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { build } from './build.js';
import { watch } from './watch.js';

const projectFolder = new URL('../', import.meta.url).pathname;
const packageJSON = JSON.parse(readFileSync(resolve(projectFolder, 'package.json'), 'utf8')) as { version: string };

program
	.name('versatiles-frontend')
	.version(packageJSON.version);

program
	.command('build')
	.description('build release files and notes')
	.action(async () => {
		await build();
	});

program
	.command('serve <frontend>')
	.description('start server in developer mode, so you can work on one of the frontends')
	.action(async (frontend) => {
		await watch(String(frontend));
	});

program.parse();
