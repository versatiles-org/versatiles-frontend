import { Curl } from './curl';
import { basename, join } from 'node:path';
import { getLatestReleaseVersion } from './utils';
import Pf from './async';
import notes from './release_notes';
import type { FileSystem } from './file_system';

// Define constants for asset directories.
const folderStyle = 'assets/styles/';
const folderFonts = 'assets/fonts/';
const folderSprites = 'assets/sprites/';

/**
 * Retrieves and processes all necessary assets for the project.
 * This includes fonts, styles, and MapLibre-related assets.
 * 
 * @param {FileSystem} fileSystem - The file system interface to use for file operations.
 * @returns {Pf} - A parallelized promise for loading all assets, wrapped with progress tracking.
 */
export function getAssets(fileSystem: FileSystem): Pf {
	return Pf.wrapProgress('load assets',
		Pf.parallel(
			addFont('fonts'),
			addStyles(),
			addMaplibre(),
			addMaplibreInspect(),
		),
	);

	/**
	 * Adds fonts to the project by downloading and extracting them from the specified release.
	 * 
	 * @param {string} fontName - The name of the font to add.
	 * @returns {Pf} - An async operation wrapped in a progress-tracking object.
	 */
	function addFont(fontName: string): Pf {
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		return Pf.wrapAsync('add fonts', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-fonts');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${fontName}.tar.gz`)
				.ungzipUntar(folderFonts);
		});
	}

	/**
	 * Adds styles and sprites to the project by downloading and extracting them from the specified releases.
	 * 
	 * @returns {Pf} - An async operation wrapped in a progress-tracking object.
	 */
	function addStyles(): Pf {
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-style)');
		return Pf.wrapAsync('add styles', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-style');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/styles.tar.gz`)
				.ungzipUntar(folderStyle);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/versatiles-style.tar.gz`)
				.ungzipUntar(folderStyle);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz`)
				.ungzipUntar(folderSprites);
		});
	}

	/**
	 * Adds MapLibre GL JS to the project by downloading and extracting the distribution files from the specified release.
	 * 
	 * @returns {Pf} - An async operation wrapped in a progress-tracking object.
	 */
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

	/**
	 * Adds MapLibre GL Inspect plugin to the project by downloading and saving the necessary JavaScript and CSS files.
	 * 
	 * @returns {Pf} - An async operation wrapped in a progress-tracking object.
	 */
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
