import { Curl } from './curl.js';
import { basename, join } from 'node:path';
import { getLatestReleaseVersion } from './utils.js';
import Pf from './async.js';
import notes from './release_notes.js';
import type { FileSystem } from './file_system.js';
import { resolve as urlResolve } from 'node:url';


const folderStyle = 'assets/styles/';
const folderFonts = 'assets/fonts/';
const folderSprites = 'assets/sprites/';

export function getAssets(fileSystem: FileSystem): Pf {
	return Pf.wrapProgress('load assets',
		Pf.parallel(
			addFont('fonts'),
			addStyles(),
			addSprites(),
			addMaplibre(),
			addMaplibreInspect(),
		),
	);

	function addFont(fontName: string): Pf {
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		return Pf.wrapAsync('add fonts', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-fonts');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${fontName}.tar.gz`)
				.ungzipUntar(folderFonts);
		});
	}

	function addStyles(): Pf {
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-styles)');
		return Pf.wrapAsync('add styles', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-styles');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-styles/releases/download/v${version}/styles.tar.gz`)
				.ungzipUntar(folderStyle);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-styles/releases/download/v${version}/versatiles-style.tar.gz`)
				.ungzipUntar(folderStyle);
		});
	}

	function addSprites(): Pf {
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-sprites)');
		return Pf.wrapAsync('add sprites', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-sprites');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-sprites/releases/download/v${version}/sprites.tar.gz`)
				.ungzipUntar(folderSprites);
		});
	}

	function addMaplibre(): Pf {
		const folder = 'assets/maplibre-gl';
		const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
		return Pf.wrapAsync('add maplibre', 1, async () => {
			const version = await getLatestReleaseVersion('maplibre', 'maplibre-gl-js');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/maplibre/maplibre-gl-js/releases/download/v${version}/dist.zip`)
				.unzip(filename => /dist\/.*\.(js|css|map)$/.test(filename) && join(folder, basename(filename)));
		});
	}

	function addMaplibreInspect(): Pf {
		const folder = 'assets/maplibre-gl-inspect';
		const label = notes.add('[MapLibre GL Inspect](https://github.com/acalcutt/maplibre-gl-inspect)');
		return Pf.wrapAsync('add maplibre-gl-inspect', 1, async () => {
			const version = await getLatestReleaseVersion('acalcutt', 'maplibre-gl-inspect');
			label.setVersion(version);
			const baseUrl = `https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v${version}/`;
			await Promise.all([
				new Curl(fileSystem, baseUrl + 'maplibre-gl-inspect.min.js').save(join(folder, 'maplibre-gl-inspect.min.js')),
				new Curl(fileSystem, baseUrl + 'maplibre-gl-inspect.css').save(join(folder, 'maplibre-gl-inspect.css')),
			]);
		});
	}
}

export function checkAssets(fileSystem: FileSystem): Pf {
	// eslint-disable-next-line @typescript-eslint/require-await
	return Pf.wrapAsync('check assets', 0, async (): Promise<void> => {
		checkStyleSprites();
	});

	function checkStyleSprites(): void {
		const missingIcons = new Map<string, Set<string>>();
		const iconSet = getIcons();

		fileSystem.forEachFile(folderStyle, (filename: string, buffer: Buffer): void => {
			if (!filename.endsWith('.json')) return;

			const style: unknown = JSON.parse(buffer.toString());
			if (typeof style !== 'object') throw Error();
			if (style == null) throw Error();

			if (!('layers' in style)) throw Error();
			const { layers } = style;
			if (!Array.isArray(layers)) throw Error();

			layers.forEach((layer: unknown) => {
				if (typeof layer !== 'object') throw Error();
				if (layer == null) throw Error();

				if (!('layout' in layer)) return;
				const { layout } = layer;
				if (typeof layout !== 'object') throw Error();
				if (layout == null) throw Error();

				if (!('icon-image' in layout)) return;
				for (const iconName of extractIconNames(layout['icon-image'])) {
					if (!iconSet.has(iconName)) {
						if (missingIcons.has(iconName)) {
							missingIcons.get(iconName)?.add(filename);
						} else {
							missingIcons.set(iconName, new Set([filename]));
						}
					}
				}
			});
		});

		if (missingIcons.size > 0) {
			const iconList = Array.from(missingIcons.entries()).sort((a, b) => a[0].localeCompare(b[0]));
			iconList.forEach(([iconName, styleSet]) => {
				const styleList = Array.from(styleSet.values()).sort();
				console.error(`icon "${iconName}" is missing in: ${styleList.map(styleName => `"${styleName}"`).join(', ')}`);
			});
			throw Error();
		}

		function getIcons(): Set<string> {
			const url = urlResolve(folderSprites, 'sprites.json');

			const buffer = fileSystem.getFile(url);
			if (buffer == null) throw Error();

			const sprites: unknown = JSON.parse(buffer.toString());
			if (typeof sprites !== 'object') throw Error();
			if (sprites == null) throw Error();

			const spriteList = Object.keys(sprites);

			return new Set(spriteList);
		}

		function* extractIconNames(def: unknown): Generator<string, void, void> {
			if (typeof def === 'string') {
				yield def;
				return;
			}

			if (!Array.isArray(def)) throw Error();

			switch (def[0]) {
				case 'match':
					for (let i = 3; i < def.length; i += 2) yield* extractIconNames(def[i]);
					yield* extractIconNames(def[def.length - 1]);
					return;
			}

			console.log(def);
			throw Error();
		}
	}
}
