import { Curl } from './curl';
import { basename, join } from 'node:path';
import PromiseFunction from '../utils/async';
import notes from './release_notes';
import type { FileSystem } from './file_system';
import { getLatestReleaseVersion } from './release_version';

// Define constants for asset directories.
const folderStyle = 'assets/styles/';
const folderFonts = 'assets/fonts/';
const folderSprites = 'assets/sprites/';

/**
 * Retrieves and processes all necessary assets for the project.
 * This includes fonts, styles, and MapLibre-related assets.
 * 
 * @param {FileSystem} fileSystem - The file system interface to use for file operations.
 * @returns {PromiseFunction} - A parallelized promise for loading all assets, wrapped with progress tracking.
 */
export function getAssets(fileSystem: FileSystem): PromiseFunction {
	return PromiseFunction.wrapProgress('load assets',
		PromiseFunction.parallel(
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
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addFont(fontName: string): PromiseFunction {
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		return PromiseFunction.wrapAsync('add fonts', 1, async () => {
			const version = await getLatestReleaseVersion('versatiles-org', 'versatiles-fonts');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${fontName}.tar.gz`)
				.ungzipUntar(folderFonts);
		});
	}

	/**
	 * Adds styles and sprites to the project by downloading and extracting them from the specified releases.
	 * 
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addStyles(): PromiseFunction {
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-style)');
		return PromiseFunction.wrapAsync('add styles', 1, async () => {
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
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addMaplibre(): PromiseFunction {
		const folder = 'assets/maplibre-gl';
		const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
		return PromiseFunction.wrapAsync('add maplibre', 1, async () => {
			const version = await getLatestReleaseVersion('maplibre', 'maplibre-gl-js');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/maplibre/maplibre-gl-js/releases/download/v${version}/dist.zip`)
				.unzip(filename => /dist\/.*\.(js|css|map)$/.test(filename) && join(folder, basename(filename)));
		});
	}

	/**
	 * Adds MapLibre GL Inspect plugin to the project by downloading and saving the necessary JavaScript and CSS files.
	 * 
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addMaplibreInspect(): PromiseFunction {
		const folder = 'assets/maplibre-gl-inspect';
		return PromiseFunction.wrapAsync('add maplibre-gl-inspect', 1, async () => {
			const baseUrl = `https://unpkg.com/@maplibre/maplibre-gl-inspect@latest/dist/`;
			await Promise.all([
				new Curl(fileSystem, baseUrl + 'maplibre-gl-inspect.js').save(join(folder, 'maplibre-gl-inspect.js')),
				new Curl(fileSystem, baseUrl + 'maplibre-gl-inspect.css').save(join(folder, 'maplibre-gl-inspect.css')),
			]);
		});
	}
}
