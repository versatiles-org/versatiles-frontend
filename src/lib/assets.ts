import { Curl } from './curl.js';
import { basename, join } from 'node:path';
import { getLatestReleaseVersion } from './utils.js';
import Pf from './async.js';
import notes from './release_notes.js';
import type { FileSystem } from './file_system.js';

export function getAssets(fileSystem: FileSystem): Pf {

	return Pf.wrapProgress('load assets',
		Pf.parallel(
			addFont('fonts'),
			addStyles(),
			addMaplibre(),
			addMaplibreInspect(),
		),
	);

	function addFont(fontName: string): Pf {
		const folder = 'assets/fonts';
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		return Pf.wrapAsync('add fonts', 1, async () => {
			const version: string = await getLatestReleaseVersion('versatiles-org', 'versatiles-fonts');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${fontName}.tar.gz`)
				.ungzipUntar(folder);
		});
	}

	function addStyles(): Pf {
		const folder = 'assets/styles';
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-styles)');
		return Pf.wrapAsync('add styles', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-styles');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-styles/releases/download/v${version}/styles.tar.gz`)
				.ungzipUntar(folder);
		});
	}

	function addMaplibre(): Pf {
		const folder = 'assets/maplibre';
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