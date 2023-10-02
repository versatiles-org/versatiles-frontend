#!/usr/bin/env node

import { basename, resolve } from 'node:path';
import { cleanupFolder, copyRecursive, curl, ensureFolder } from './lib/utils.js';
import Progress from './lib/progress.js';
import notes from './lib/release_notes.js';
import { existsSync, readFileSync, rmSync, watch } from 'node:fs';



const watch_mode = process.argv[2] === 'watch';
if (watch_mode) console.log('Start in watch mode');

const path = new URL('../', import.meta.url).pathname;
const folders = {
	src: resolve(path, 'src'),
	dist: resolve(path, 'dist'),
	frontend: resolve(path, 'dist/frontend'),
	assets: resolve(path, 'dist/frontend/assets'),
	temp: resolve(path, 'dist/temp'),
}



// create an empty folder
await cleanupFolder(folders.dist);

let progress = new Progress();

await parallel(
	addFrontend(),
	sequential(
		addFonts('noto_sans'),
		addStyles(),
	),
	addMaplibre(),
	addMaplibreInspect(),
)();

notes.save(resolve(folders.dist, 'notes.md'));



function parallel(...promises) {
	return () => Promise.all(promises.map(resolveAsync))
}
function sequential(...promises) {
	return async () => {
		for (let promise of promises) await resolveAsync(promise);
	}
}
async function resolveAsync(entry) {
	if (typeof entry !== 'function') throw Error();
	entry = entry();

	if (typeof entry !== 'object') throw Error();
	if (typeof entry.then !== 'function') throw Error();

	entry = await entry;
}



function addFrontend() {
	let s = progress.add('frontend');
	ensureFolder(folders.frontend);
	if (watch_mode) {
		watch(folders.src, { recursive: true }, async (eventType, filename) => {
			s.open();
			let filenameSrc = resolve(folders.src, filename);
			let filenameDst = resolve(folders.frontend, filename);
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
		})
	}
	return async () => {
		await copyRecursive(folders.src, folders.frontend);
		notes.setVersion(JSON.parse(readFileSync(resolve(path, 'package.json'))).version);
		s.close();
	}
}

function addFonts(...font_names) {
	let setVersion = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
	let folder = getAssetFolder('fonts');
	let asyncFunctions = font_names.map(font_name => {
		let s = progress.add('font ' + font_name);
		return async () => {
			await curl(`https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/${font_name}.tar.gz`)
				.ungzip_untar(folder);
			s.close('font ' + font_name);
		}
	});
	return parallel(...asyncFunctions, async () => {
		setVersion(await curl('https://api.github.com/repos/versatiles-org/versatiles-fonts/tags').get_latest_git_tag());
	});
}

function addStyles() {
	let setVersion = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-styles)');
	let folder = getAssetFolder('styles');
	let s = progress.add('styles');
	return async () => {
		await curl('https://github.com/versatiles-org/versatiles-styles/releases/latest/download/styles.tar.gz')
			.ungzip_untar(folder);
		let { process_styles } = await import('./process_styles.js');
		await process_styles(folder, getAssetFolder('fonts'));
		setVersion(await curl('https://api.github.com/repos/versatiles-org/versatiles-styles/tags').get_latest_git_tag());
		s.close();
	}
}

function addMaplibre() {
	let setVersion = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
	let s = progress.add('maplibre');
	let folder = getAssetFolder('maplibre');
	return async () => {
		await curl('https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip')
			.unzip(filename => /dist\/.*\.(js|css|map)$/.test(filename) && resolve(folder, basename(filename)));
		setVersion(await curl('https://api.github.com/repos/maplibre/maplibre-gl-js/tags').get_latest_git_tag());
		s.close();
	}
}

function addMaplibreInspect() {
	const setVersion = notes.add('[MapLibre GL Inspect](https://github.com/acalcutt/maplibre-gl-inspect)');
	const s = progress.add('maplibre-inspect');
	const folder = getAssetFolder('maplibre-inspect');
	const baseUrl = 'https://github.com/acalcutt/maplibre-gl-inspect/releases/latest/download/';

	return async () => {
		await Promise.all([
			curl(baseUrl + 'maplibre-gl-inspect.min.js').save(resolve(folder, 'maplibre-gl-inspect.min.js')),
			curl(baseUrl + 'maplibre-gl-inspect.css').save(resolve(folder, 'maplibre-gl-inspect.css')),
		])

		setVersion(await curl('https://api.github.com/repos/acalcutt/maplibre-gl-inspect/tags').get_latest_git_tag());

		s.close();
	}
}

function getAssetFolder(name) {
	let folder = resolve(folders.assets, name);
	ensureFolder(folder);
	return folder;
}
