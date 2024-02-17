
import { Curl } from './curl.js';
import { basename, join } from 'node:path';
import { getLatestReleaseVersion } from './utils.js';
import type { PromiseFunction } from './async.js';
import { parallel, sequential, wrapProgress } from './async.js';
import notes from './release_notes.js';
import progress from './progress.js';
import type { FileSystem } from './file_system.js';

export function getAssets(fileSystem: FileSystem): PromiseFunction {

	return wrapProgress('load assets',
		parallel(
			addFonts('fonts'),
			addStyles(),
			addMaplibre(),
			addMaplibreInspect(),
		),
	);

	function addFonts(...fontNames: string[]): PromiseFunction {
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		const folder = 'assets/fonts';
		let version: string;
		return sequential(
			async (): Promise<void> => {
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
}