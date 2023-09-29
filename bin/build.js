#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { cleanupFolder, copyRecursive, curl, ensureFolder } from './lib/utils.js';
import progress from './lib/progress.js';



const watch = process.argv[2] === 'watch';
if (watch) console.log('Start in watch mode');

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

await parallel(
	addFrontend(),
	sequential(
		addFonts('noto_sans'),
		addStyles(),
	),
	//addMaplibre(),
	addMaplibreInspect(),
)();

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
	return async () => {
		await copyRecursive(folders.src, folders.frontend);
		s.close();
	}
}

function addFonts(...font_names) {
	let folder = getAssetFolder('fonts');
	let asyncFunctions = font_names.map(font_name => {
		let s = progress.add('font ' + font_name);
		return async () => {
			await curl(`https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/${font_name}.tar.gz`)
				.ungzip_untar(folder);
			s.close('font ' + font_name);
		}
	});
	return parallel(...asyncFunctions);
}

function addStyles() {
	let folder = getAssetFolder('styles');
	let s = progress.add('styles');
	return async () => {
		await curl('https://github.com/versatiles-org/versatiles-styles/releases/latest/download/styles.tar.gz')
			.ungzip_untar(folder);
		let { process_styles } = await import('./process_styles.js');
		await process_styles(folder, getAssetFolder('fonts'));
		s.close();
	}
}

function addMaplibre() {
	let s = progress.add('maplibre');
	let folder = getAssetFolder('maplibre');
	return async () => {
		await curl('https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip')
			.unzip((filename, buffer) => {
				if (/dist\/.*\.(js|css|map)$/.test(filename)) {
					writeFileSync(resolve(folder, basename(filename)), buffer)
				}
			});
		s.close();
	}
}

function addMaplibreInspect() {
	let s = progress.add('maplibre-inspect');
	let folder = getAssetFolder('maplibre-inspect');
	return async () => {

		await curl('https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.4.6/maplibre-gl-inspect.min.js')
			.save(resolve(folder, 'maplibre-gl-inspect.min.js'));

		await curl('https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.4.6/maplibre-gl-inspect.css')
			.save(resolve(folder, 'maplibre-gl-inspect.css'));

		s.close();
	}
}

/*

echo " -> make release notes"

echo "   -> get version: frontend"
V_FRONTEND=v$(jq -r '.version' ../package.json)

echo "   -> get version: fonts"
V_FONTS=$(curl -s 'https://api.github.com/repos/versatiles-org/versatiles-fonts/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "   -> get version: styles"
V_STYLES=$(curl -s 'https://api.github.com/repos/versatiles-org/versatiles-styles/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "   -> get version: sprites"
V_SPRITES=$(curl -s 'https://api.github.com/repos/versatiles-org/versatiles-sprites/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "   -> get version: maplibre"
V_MAPLIBRE=$(curl -s 'https://api.github.com/repos/maplibre/maplibre-gl-js/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "" > notes.md
echo "## VersaTiles Frontend *$V_FRONTEND*" >> notes.md
echo "" >> notes.md
echo "also includes:" >> notes.md
echo "- MapLibre GL JS *$V_MAPLIBRE*" >> notes.md
echo "- VersaTiles Fonts *$V_FONTS*" >> notes.md
echo "- VersaTiles Sprites *$V_SPRITES*" >> notes.md
echo "- VersaTiles Styles *$V_STYLES*" >> notes.md
*/

function getAssetFolder(name) {
	let folder = resolve(folders.assets, name);
	ensureFolder(folder);
	return folder;
}
