import { Curl } from '../utils/curl';
import { basename, join } from 'node:path';
import PromiseFunction from '../utils/async';
import notes from '../utils/release_notes';
import type { FileSystem } from '../filesystem/file_system';
import { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } from '../utils/release_version';

// Define constants for asset directories.
const folderStyle = 'assets/styles/';
const folderLibrary = 'assets/lib/';
const folderGlyphs = 'assets/glyphs/';
const folderSprites = 'assets/sprites/';

/**
 * Retrieves and processes all necessary assets for the project.
 * This includes fonts, styles, and MapLibre-related assets.
 * 
 * @param {FileSystem} fileSystem - The file system interface to use for file operations.
 * @returns {PromiseFunction} - A parallelized promise for loading all assets, wrapped with progress tracking.
 */
export function loadAssets(fileSystem: FileSystem): PromiseFunction {
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
			const version = await getLatestGithubReleaseVersion('versatiles-org', 'versatiles-fonts');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${fontName}.tar.gz`)
				.ungzipUntar(f => [folderGlyphs, f]);
		});
	}

	/**
	 * Adds styles and sprites to the project by downloading and extracting them from the specified releases.
	 * 
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addStyles(): PromiseFunction {
		const folderLib = join(folderLibrary, 'versatiles-style/');
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-style)');
		return PromiseFunction.wrapAsync('add styles', 1, async () => {
			const version = await getLatestGithubReleaseVersion('versatiles-org', 'versatiles-style', true);
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/styles.tar.gz`)
				.ungzipUntar(f => [folderStyle, f]);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/versatiles-style.tar.gz`)
				.ungzipUntar(f => [folderLib, f]);
			await new Curl(fileSystem, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz`)
				.ungzipUntar(f => [folderSprites, f]);
		});
	}

	/**
	 * Adds MapLibre GL JS to the project by downloading and extracting the distribution files from the specified release.
	 * 
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addMaplibre(): PromiseFunction {
		const folder = join(folderLibrary, 'maplibre-gl');
		const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
		return PromiseFunction.wrapAsync('add maplibre-gl', 1, async () => {
			const version = await getLatestGithubReleaseVersion('maplibre', 'maplibre-gl-js');
			label.setVersion(version);
			await new Curl(fileSystem, `https://github.com/maplibre/maplibre-gl-js/releases/download/v${version}/dist.zip`)
				.unzip(f => /package\/dist\/.*\.(js|css|map)$/.test(f) && [folder, basename(f)]);
		});
	}

	/**
	 * Adds MapLibre GL Inspect plugin to the project by downloading and saving the necessary JavaScript and CSS files.
	 * 
	 * @returns {PromiseFunction} - An async operation wrapped in a progress-tracking object.
	 */
	function addMaplibreInspect(): PromiseFunction {
		const folder = join(folderLibrary, 'maplibre-gl-inspect');
		const label = notes.add('[MapLibre GL Inspect](https://github.com/maplibre/maplibre-gl-inspect)');
		return PromiseFunction.wrapAsync('add maplibre-gl-inspect', 1, async () => {
			const version = await getLatestNPMReleaseVersion('@maplibre/maplibre-gl-inspect');
			label.setVersion(version);
			await new Curl(fileSystem, `https://registry.npmjs.org/@maplibre/maplibre-gl-inspect/-/maplibre-gl-inspect-${version}.tgz`)
				.ungzipUntar(f => /dist\/.*\.(js|css|map)$/.test(f) && [folder, basename(f)]);
		});
	}
}
