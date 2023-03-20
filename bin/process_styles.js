#!/usr/bin/env node

import process from 'node:process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));



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
let knownFontNames = new Set();
readdirSync(fontsPath).forEach(subFolder => {
	if (!statSync(resolve(fontsPath, subFolder)).isDirectory()) return;
	knownFontNames.add(subFolder);
})



readdirSync(path).forEach(styleName => {
	if (styleName.startsWith('.')) return;

	let stylePath = resolve(path, styleName);
	let styleFilename = resolve(stylePath, 'style.json');
	if (!existsSync(styleFilename)) {
		console.error(`ERROR - style "${styleFilename}" not found`);
		process.exit(1);
	}

	let style = JSON.parse(readFileSync(styleFilename, 'utf8'));
	console.log('process', styleName);

	validateAndPatchStyle();
	writeFileSync(resolve(stylePath, 'style.min.json'), JSON.stringify(style));
	writeFileSync(resolve(stylePath, 'style.json'), JSON.stringify(style, null, '\t'));



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
				source.attribution = '<a href="https://www.openstreetmap.org/copyright/de">© OpenStreetMap</a>'
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
					throw Error('implement "resolvedImage" checking');
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

					if (!knownFontNames.has(list[i])) {
						throw Error(`unknown font name "${list[i]}"`)
					}
				}
			})
		}
	}
})
