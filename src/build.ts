#!/usr/bin/env node

import { basename, resolve } from 'node:path';
import { cleanupFolder, copyRecursive, Curl, ensureFolder } from './lib/utils.js';
import Progress from './lib/progress.js';
import notes from './lib/release_notes.js';
import { existsSync, readFileSync, rmSync, watch } from 'node:fs';
import type { PromiseFunction } from './lib/async.js';
import { parallel, sequential } from './lib/async.js';



const watchMode = process.argv[2] === 'watch';
if (watchMode) console.log('Start in watch mode');

const path = new URL('../', import.meta.url).pathname;
const folders = {
	src: resolve(path, 'src'),
	dist: resolve(path, 'dist'),
	frontend: resolve(path, 'dist/frontend'),
	assets: resolve(path, 'dist/frontend/assets'),
	temp: resolve(path, 'dist/temp'),
};



// create an empty folder
await cleanupFolder(folders.dist);

const progress = new Progress();

await parallel(
	addFrontend(),
	sequential(
		addFonts('fonts'),
		addStyles(),
	),
	addMaplibre(),
	addMaplibreInspect(),
)();

notes.save(resolve(folders.dist, 'notes.md'));




function addFrontend(): PromiseFunction {
	const s = progress.add('frontend');
	ensureFolder(folders.frontend);
	if (watchMode) {
		watch(folders.src, { recursive: true }, (eventType, filename) => {
			if (filename == null) return;
			s.open();
			const filenameSrc = resolve(folders.src, filename);
			const filenameDst = resolve(folders.frontend, filename);
			void (async (): Promise<void> => {
				try {
					if (existsSync(filenameSrc)) {
						await copyRecursive(filenameSrc, filenameDst);
					} else {
						rmSync(filenameDst);
					}
				} catch (err) {
					console.error('Error:', err);
				}
				s.close();
			})();
		});
	}
	return async () => {
		await copyRecursive(folders.src, folders.frontend);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		notes.setVersion(String(JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8')).version));
		s.close();
	};
}

function addFonts(...fontNames: string[]): PromiseFunction {
	const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
	const folder = getAssetFolder('fonts');
	const asyncFunctions = fontNames.map(fontName => {
		const s = progress.add('font ' + fontName);
		return async () => {
			await new Curl(`https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/${fontName}.tar.gz`)
				.ungzipUntar(folder);
			s.close();
		};
	});
	return parallel(...asyncFunctions, async () => {
		label.setVersion(await new Curl('https://api.github.com/repos/versatiles-org/versatiles-fonts/tags').getLatestGitTag());
	});
}

function addStyles(): PromiseFunction {
	const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-styles)');
	const folder = getAssetFolder('styles');
	const s = progress.add('styles');
	return async () => {
		await new Curl('https://github.com/versatiles-org/versatiles-styles/releases/latest/download/styles.tar.gz')
			.ungzipUntar(folder);
		label.setVersion(await new Curl('https://api.github.com/repos/versatiles-org/versatiles-styles/tags').getLatestGitTag());
		s.close();
	};
}

function addMaplibre(): PromiseFunction {
	const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
	const s = progress.add('maplibre');
	const folder = getAssetFolder('maplibre');
	return async () => {
		await new Curl('https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip')
			.unzip(filename => /dist\/.*\.(js|css|map)$/.test(filename) && resolve(folder, basename(filename)));
		label.setVersion(await new Curl('https://api.github.com/repos/maplibre/maplibre-gl-js/tags').getLatestGitTag());
		s.close();
	};
}

function addMaplibreInspect(): PromiseFunction {
	const label = notes.add('[MapLibre GL Inspect](https://github.com/acalcutt/maplibre-gl-inspect)');
	const s = progress.add('maplibre-gl-inspect');
	const folder = getAssetFolder('maplibre-gl-inspect');
	const baseUrl = 'https://github.com/acalcutt/maplibre-gl-inspect/releases/latest/download/';
	return async () => {
		await Promise.all([
			new Curl(baseUrl + 'maplibre-gl-inspect.min.js').save(resolve(folder, 'maplibre-gl-inspect.min.js')),
			new Curl(baseUrl + 'maplibre-gl-inspect.css').save(resolve(folder, 'maplibre-gl-inspect.css')),
		]);
		label.setVersion(await new Curl('https://api.github.com/repos/acalcutt/maplibre-gl-inspect/tags').getLatestGitTag());

		s.close();
	};
}

function getAssetFolder(name: string): string {
	const folder = resolve(folders.assets, name);
	ensureFolder(folder);
	return folder;
}
