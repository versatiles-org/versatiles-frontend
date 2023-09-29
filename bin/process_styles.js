#!/usr/bin/env node

import { existsSync, statSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const filename_me = new URL(import.meta.url).pathname;
const filename_called = process.argv[1];

if (filename_me == filename_called) {
	let path = process.argv[2];
	if (!path) {
		console.error('ERROR - need one argument: the name of style path');
		process.exit(1);
	}

	path = resolve(process.cwd(), path);
	if (!existsSync(path)) {
		console.error(`ERROR - path "${path}" not found`);
		process.exit(1);
	}

	const fontsPath = resolve(path, '../fonts');


	try {
		await process_styles(path, fontsPath, true);
	} catch (err) {
		console.log(err.message);
		process.exit(1);
	}
}



export async function process_styles(path, fontsPath, verbose) {
	const knownFontNamesSet = new Set(readdirSync(fontsPath).filter(subFolder => statSync(resolve(fontsPath, subFolder)).isDirectory()));

	for (let styleName of readdirSync(path)) {
		if (styleName.startsWith('.')) continue;
		if (!styleName.endsWith('.json')) continue;

		let styleFilename = resolve(path, styleName);
		if (!existsSync(styleFilename)) throw new Error(`ERROR - style "${styleFilename}" not found`);

		let style = JSON.parse(await readFile(styleFilename, 'utf8'));
		if (verbose) console.log('process', styleName);

		validateAndPatchStyle();
		await writeFile(styleFilename, JSON.stringify(style));

		function validateAndPatchStyle() {
			fixMeta();
			fixTileSource();
			fixSprites();
			fixGlyphs();

			function fixMeta() {
				if (style.metadata.license !== 'https://creativecommons.org/publicdomain/zero/1.0/') throw Error();
			}

			function fixTileSource() {
				// don't reference tile source
				Object.values(style.sources).forEach(source => {
					delete source.tiles;
					//source.attribution = '<a href="https://www.openstreetmap.org/copyright/de">© OpenStreetMap</a>'
				})
			}

			function fixSprites() {
				let knownSprites = new Set();
				if (style.sprites) {
					style.sprites = `/assets/styles/${styleName}/sprite`;
					let sprites = JSON.parse(readFileSync(resolve(stylePath, 'sprite.json'), 'utf8'));
					Object.keys(sprites).forEach(name => knownSprites.add(name));
				}

				let attributes = 'background-pattern,fill-extrusion-pattern,fill-pattern,icon-image,line-pattern'.split(',');
				style.layers.forEach(layer => {
					if (!layer.paint) return;
					attributes.forEach(attribute => {
						if (!layer.paint[attribute]) return;
						if (verbose) console.log('implement "resolvedImage" checking');
					})
				})
			}

			function fixGlyphs() {
				style.glyphs = '/assets/fonts/{fontstack}/{range}.pbf'

				style.layers.forEach(layer => {
					if (!layer.layout) return;
					if (!layer.layout['text-font']) return;

					let list = layer.layout['text-font'];
					if (!Array.isArray(list)) throw Error('must be an array');
					for (let i = 0; i < list.length; i++) {
						if (typeof list[i] !== 'string') throw Error('must be an array of strings');

						list[i] = list[i].toLowerCase().replace(/\s+/g, '_');

						if (!knownFontNamesSet.has(list[i])) {
							throw Error(`unknown font name "${list[i]}"`)
						}
					}
				})
			}
		}
	}
}