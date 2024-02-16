#!/usr/bin/env node

import { basename, resolve, join } from 'node:path';
import { cleanupFolder, getLatestReleaseVersion } from './lib/utils.js';
import Progress from './lib/progress.js';
import notes from './lib/release_notes.js';
import { readFileSync } from 'node:fs';
import type { PromiseFunction } from './lib/async.js';
import { parallel, sequential } from './lib/async.js';
import { FileSystem } from './lib/file_system.js';
import { Frontend } from './lib/frontend.js';
import { Curl } from './lib/curl.js';



const watchMode = process.argv[2] === 'watch';
if (watchMode) console.log('Start in watch mode');

const dstFolder = new URL('../dist', import.meta.url).pathname;
const frontendsFolder = new URL('../frontends', import.meta.url).pathname;
const fileSystem = new FileSystem();

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const frontendVersion = String(JSON.parse(readFileSync(new URL('../package.json', import.meta.url).pathname, 'utf8')).version);
notes.setVersion(frontendVersion);


// create an empty folder
await cleanupFolder(dstFolder);

const progress = new Progress();

const frontendConfigs = JSON.parse(readFileSync(resolve(frontendsFolder, 'frontends.json'), 'utf8')) as unknown[];

await sequential(
	parallel(
		//addFonts('fonts'),
		//addFonts('noto_sans'),
		addStyles(),
		//addMaplibre(),
		addMaplibreInspect(),
	),
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
	return async () => {
		const frontend = new Frontend(fileSystem, config, frontendsFolder);
		await frontend.saveAsTarGz(dstFolder);
		await frontend.saveAsBrTar(dstFolder);

		s.close();
	};
}

function addFonts(...fontNames: string[]): PromiseFunction {
	const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
	const folder = 'assets/fonts';
	let version: string;
	return sequential(
		async () => {
			version = await getLatestReleaseVersion('versatiles-org', 'versatiles-fonts');
			label.setVersion(version);
		},
		parallel(...fontNames.map(fontName => {
			const s = progress.add('add font: ' + fontName);
			return async () => {
				await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${fontName}.tar.gz`)
					.ungzipUntar(folder);
				s.close();
			};
		})),
	);
}

function addStyles(): PromiseFunction {
	const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-styles)');
	const folder = 'assets/styles';
	const s = progress.add('add styles');
	return async () => {
		const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-styles');
		await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-styles/releases/download/v${version}/styles.tar.gz`)
			.ungzipUntar(folder);
		label.setVersion(version);
		s.close();
	};
}

function addMaplibre(): PromiseFunction {
	const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
	const s = progress.add('add maplibre');
	const folder = 'assets/maplibre';
	return async () => {
		const version = await getLatestReleaseVersion('maplibre', 'maplibre-gl-js');
		await new Curl(fileSystem, `https://github.com/maplibre/maplibre-gl-js/releases/download/v${version}/dist.zip`)
			.unzip(filename => /dist\/.*\.(js|css|map)$/.test(filename) && join(folder, basename(filename)));
		label.setVersion(version);
		s.close();
	};
}

function addMaplibreInspect(): PromiseFunction {
	const label = notes.add('[MapLibre GL Inspect](https://github.com/acalcutt/maplibre-gl-inspect)');
	const s = progress.add('add maplibre-gl-inspect');
	const folder = 'assets/maplibre-gl-inspect';
	return async () => {
		const version = await getLatestReleaseVersion('acalcutt', 'maplibre-gl-inspect');
		const baseUrl = `https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v${version}/`;
		await Promise.all([
			new Curl(fileSystem, baseUrl + 'maplibre-gl-inspect.min.js').save(join(folder, 'maplibre-gl-inspect.min.js')),
			new Curl(fileSystem, baseUrl + 'maplibre-gl-inspect.css').save(join(folder, 'maplibre-gl-inspect.css')),
		]);
		label.setVersion(version);

		s.close();
	};
}
